"""API-level tests for the YouTube split endpoints (no network, Demucs mocked).

Verifies: clean 4xx/5xx errors, URL generation behind proxies/custom domains (no
localhost), partial-stem handling, and that /processed + /download block traversal.
"""
import shutil
import sys
import types
import uuid

import pytest

try:  # main.py imports separator -> audio_separator (heavy). Stub it if missing.
    import audio_separator  # noqa: F401
except Exception:
    stub = types.ModuleType("separator")

    class AudioSeparator:  # minimal stand-in, never used by the YouTube flow
        def __init__(self, *a, **k):
            pass

    stub.AudioSeparator = AudioSeparator
    sys.modules["separator"] = stub

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
import youtube_pipeline as ytp  # noqa: E402

PROXY_HEADERS = {"X-Forwarded-Proto": "https", "X-Forwarded-Host": "stems.example.com"}


@pytest.fixture()
def client(monkeypatch):
    # Rate limits would make repeated test calls flaky.
    main.limiter.enabled = False
    monkeypatch.setattr(ytp, "check_youtube_split_dependencies", lambda: None)
    with TestClient(main.app) as c:
        yield c


@pytest.fixture()
def cleanup_jobs():
    created = []
    yield created
    for jid in created:
        shutil.rmtree(main.PROCESSED_DIR / jid, ignore_errors=True)
        shutil.rmtree(main.UPLOAD_DIR / f"yt_{jid}", ignore_errors=True)


def _fake_split(stems):
    def run(url, job_id, upload_dir, processed_dir, num_stems=4, out_format="wav", progress=None, max_duration_s=None):
        out = processed_dir / job_id
        out.mkdir(parents=True, exist_ok=True)
        names = {}
        for s in stems:
            (out / f"Title_{s}.{out_format}").write_bytes(b"RIFF fake")
            names[s] = f"Title_{s}.{out_format}"
        expected = ytp.EXPECTED_STEMS[ytp.normalize_stem_count(num_stems)]
        return ytp.SplitResult(title="Title 🎵", safe_title="Title", video_id="jNQXAC9IVRw", model="htdemucs",
                               device="cpu", format=out_format, stems=names,
                               missing=[s for s in expected if s not in names], notes=[])
    return run


def test_non_youtube_url_rejected(client):
    r = client.post("/api/youtube-split", json={"url": "https://vimeo.com/1"})
    assert r.status_code == 400 and "YouTube" in r.json()["detail"]
    r = client.post("/process_youtube/", json={"url": "https://evil.com/watch?v=jNQXAC9IVRw"})
    assert r.status_code == 400


def test_missing_demucs_is_clean_503(client, monkeypatch):
    def missing():
        raise ytp.PipelineError("Stem separation engine (Demucs) is not installed on the server.", 503)
    monkeypatch.setattr(ytp, "check_youtube_split_dependencies", missing)
    r = client.post("/api/youtube-split", json={"url": "https://youtu.be/jNQXAC9IVRw"})
    assert r.status_code == 503 and "Demucs" in r.json()["detail"]


def test_sync_split_urls_follow_proxy_host(client, monkeypatch, cleanup_jobs):
    monkeypatch.setattr(ytp, "run_youtube_split", _fake_split(["vocals", "drums", "bass", "other"]))
    r = client.post("/api/youtube-split", json={"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw&t=9s&si=x"},
                    headers=PROXY_HEADERS)
    assert r.status_code == 200, r.text
    body = r.json()
    cleanup_jobs.append(body["file_id"])
    assert set(body["stems"]) == {"vocals", "drums", "bass", "other"}
    for u in list(body["stems"].values()) + [body["zip"]]:
        assert u.startswith("https://stems.example.com/") and "localhost" not in u
    # files are actually served at the generated paths
    path = body["stems"]["vocals"].replace("https://stems.example.com", "")
    assert client.get(path).status_code == 200
    assert client.get(body["zip"].replace("https://stems.example.com", "")).status_code == 200


def test_configured_base_url_used(client, monkeypatch, cleanup_jobs):
    monkeypatch.setenv("DEEPSPLIT_PUBLIC_BASE_URL", "https://api.deepsplit.app")
    monkeypatch.setattr(ytp, "run_youtube_split", _fake_split(["vocals", "drums", "bass", "other"]))
    r = client.post("/api/youtube-split", json={"url": "https://youtu.be/jNQXAC9IVRw"})
    cleanup_jobs.append(r.json()["file_id"])
    assert r.json()["stems"]["bass"].startswith("https://api.deepsplit.app/processed/")
    files = client.get(f"/files/{r.json()['file_id']}").json()["files"]
    assert all(f["url"].startswith("https://api.deepsplit.app/") for f in files)
    assert {f["stem"] for f in files if not f["filename"].endswith(".zip")} == {"vocals", "drums", "bass", "other"}


def test_partial_stems_give_clean_error(client, monkeypatch, cleanup_jobs):
    monkeypatch.setattr(ytp, "run_youtube_split", _fake_split(["vocals", "drums"]))
    r = client.post("/api/youtube-split", json={"url": "https://youtu.be/jNQXAC9IVRw"})
    assert r.status_code == 500
    assert "missing: bass, other" in r.json()["detail"]
    for jid, info in main.processing_progress.items():
        if info.get("error") and "missing" in info["error"]:
            cleanup_jobs.append(jid)


def test_pipeline_failure_reported_via_background_progress(client, monkeypatch, cleanup_jobs):
    def boom(*a, **k):
        raise ytp.PipelineError("Stem separation (Demucs) failed. See server logs for details.")
    monkeypatch.setattr(ytp, "run_youtube_split", boom)
    r = client.post("/process_youtube/", json={"url": "https://youtu.be/jNQXAC9IVRw", "format": "wav", "num_stems": 4})
    assert r.status_code == 200
    jid = r.json()["file_id"]
    cleanup_jobs.append(jid)
    p = client.get(f"/progress/{jid}").json()  # BackgroundTasks run before TestClient returns
    assert p["status"] == "failed" and "Demucs" in p["error"]


def test_background_success_includes_result(client, monkeypatch, cleanup_jobs):
    monkeypatch.setattr(ytp, "run_youtube_split", _fake_split(["vocals", "drums", "bass", "other"]))
    r = client.post("/process_youtube/", json={"url": "https://www.youtube.com/playlist?list=PLabc123", "format": "mp3",
                                               "num_stems": 4}, headers=PROXY_HEADERS)
    jid = r.json()["file_id"]
    cleanup_jobs.append(jid)
    p = client.get(f"/progress/{jid}").json()
    assert p["status"] == "done" and p["progress"] == 100
    assert p["result"]["stems"]["vocals"] == f"https://stems.example.com/processed/{jid}/Title_vocals.mp3"


def test_bad_format_rejected(client):
    r = client.post("/process_youtube/", json={"url": "https://youtu.be/jNQXAC9IVRw", "format": "exe"})
    assert r.status_code == 400


@pytest.mark.parametrize("path", [
    "/download/..%2F..%2F/main.py",
    "/download/../main.py",
    "/download/%2E%2E/main.py",
    "/processed/..%2F..%2Fmain.py",
    "/processed/../main.py",
    "/files/..%2F..",
])
def test_traversal_blocked(client, path):
    r = client.get(path)
    assert r.status_code in (400, 404, 422)
    assert b"import" not in r.content
