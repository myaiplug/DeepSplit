"""Unit tests for youtube_pipeline (no network, no Demucs needed).

Run:  cd backend && python -m pytest tests -q
"""
import uuid
import wave
from pathlib import Path

import pytest

import youtube_pipeline as ytp


# ── URL parsing ─────────────────────────────────────────────────────────────
@pytest.mark.parametrize("url,vid,pl", [
    ("https://www.youtube.com/watch?v=jNQXAC9IVRw", "jNQXAC9IVRw", None),
    ("https://www.youtube.com/watch?v=jNQXAC9IVRw&t=42s&si=abc&feature=share", "jNQXAC9IVRw", None),
    ("https://youtube.com/watch?feature=youtu.be&v=jNQXAC9IVRw", "jNQXAC9IVRw", None),
    ("http://m.youtube.com/watch?v=jNQXAC9IVRw", "jNQXAC9IVRw", None),
    ("https://music.youtube.com/watch?v=jNQXAC9IVRw&list=RDAMVM1", "jNQXAC9IVRw", "RDAMVM1"),
    ("https://youtu.be/jNQXAC9IVRw?si=xyz&t=3", "jNQXAC9IVRw", None),
    ("youtu.be/jNQXAC9IVRw", "jNQXAC9IVRw", None),
    ("https://www.youtube.com/shorts/jNQXAC9IVRw?feature=share", "jNQXAC9IVRw", None),
    ("https://www.youtube.com/live/jNQXAC9IVRw", "jNQXAC9IVRw", None),
    ("https://www.youtube-nocookie.com/embed/jNQXAC9IVRw", "jNQXAC9IVRw", None),
    ("https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PLabcDEF123&index=4", "jNQXAC9IVRw", "PLabcDEF123"),
    ("https://www.youtube.com/playlist?list=PLabcDEF123", None, "PLabcDEF123"),
])
def test_parse_valid_urls(url, vid, pl):
    parsed = ytp.parse_youtube_url(url)
    assert parsed.video_id == vid
    assert parsed.playlist_id == pl
    if vid:
        # canonical URL drops every extra parameter (t=, si=, list=, index=...)
        assert parsed.canonical_url == f"https://www.youtube.com/watch?v={vid}"
        assert not parsed.is_playlist_only
    else:
        assert parsed.is_playlist_only
        assert parsed.canonical_url == f"https://www.youtube.com/playlist?list={pl}"


@pytest.mark.parametrize("url", [
    "", "   ", "not a url", "https://vimeo.com/123456",
    "https://evil.com/watch?v=jNQXAC9IVRw",
    "https://youtube.com.evil.com/watch?v=jNQXAC9IVRw",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=../../etc/pwd",
    "https://www.youtube.com/channel/UC123",
    "ftp://youtube.com/watch?v=jNQXAC9IVRw",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=jNQXAC9IVRw extra",
])
def test_parse_rejects_non_youtube_or_bad_ids(url):
    with pytest.raises(ytp.YouTubeURLError) as exc:
        ytp.parse_youtube_url(url)
    assert exc.value.status_code == 400


# ── Filename sanitising ─────────────────────────────────────────────────────
@pytest.mark.parametrize("title,expected", [
    ("Me at the zoo", "Me_at_the_zoo"),
    ("🔥🔥 Beyoncé — “Halo” (Official Video) [4K] 🔥", "Beyonce_Halo_Official_Video_4K"),
    ("../../etc/passwd", "etc_passwd"),
    ("..\\..\\windows\\system32", "windows_system32"),
    ("a/b\\c:d*e?f\"g<h>i|j", "a_b_c_d_e_f_g_h_i_j"),
    ("🎵🎶", "track"),
    ("", "track"),
    ("...", "track"),
    ("CON", "track"),
])
def test_sanitize_filename(title, expected):
    assert ytp.sanitize_filename(title) == expected


def test_sanitize_long_title_is_capped_and_safe():
    title = "Very Long Title " * 50 + "😀" * 20
    out = ytp.sanitize_filename(title, max_len=60)
    assert len(out) <= 60
    assert all(c.isalnum() or c in "_-" for c in out)
    assert not out.endswith(("_", "-"))


# ── Paths: traversal + no-overwrite ─────────────────────────────────────────
def test_safe_join_blocks_traversal(tmp_path):
    assert ytp.safe_join(tmp_path, "abc", "x.wav") == (tmp_path / "abc" / "x.wav").resolve()
    for bad in ["../x", "../../etc/passwd", "/etc/passwd", "a/../../x"]:
        with pytest.raises(ytp.PipelineError):
            ytp.safe_join(tmp_path, bad)


def test_unique_path_never_overwrites(tmp_path):
    first = ytp.unique_path(tmp_path, "Song_vocals.wav")
    first.write_bytes(b"a")
    second = ytp.unique_path(tmp_path, "Song_vocals.wav")
    assert second.name == "Song_vocals_2.wav"
    second.write_bytes(b"b")
    assert ytp.unique_path(tmp_path, "Song_vocals.wav").name == "Song_vocals_3.wav"
    assert first.read_bytes() == b"a"


# ── Base URL generation (no localhost assumptions) ──────────────────────────
def test_base_url_uses_request_host_by_default():
    assert ytp.public_base_url({}, "http://127.0.0.1:8000/", env={}) == "http://127.0.0.1:8000"
    assert ytp.public_base_url({}, "https://api.staging.example.com/", env={}) == "https://api.staging.example.com"


def test_base_url_respects_reverse_proxy_headers():
    headers = {"x-forwarded-proto": "https", "x-forwarded-host": "stems.example.com", "x-forwarded-prefix": "/api"}
    assert ytp.public_base_url(headers, "http://10.0.0.5:8000/", env={}) == "https://stems.example.com/api"
    # comma-separated chains: first (client-facing) value wins
    headers = {"X-Forwarded-Proto": "https, http", "X-Forwarded-Host": "a.example.com, internal:8000"}
    assert ytp.public_base_url(headers, "http://backend:8000/", env={}) == "https://a.example.com"


def test_base_url_rejects_malicious_forwarded_values():
    headers = {"x-forwarded-proto": "javascript", "x-forwarded-host": "evil.com/<script>", "x-forwarded-prefix": "/../x"}
    assert ytp.public_base_url(headers, "http://backend:8000/", env={}) == "http://backend:8000"


def test_base_url_forwarded_can_be_disabled():
    headers = {"x-forwarded-proto": "https", "x-forwarded-host": "stems.example.com"}
    env = {"DEEPSPLIT_TRUST_FORWARDED_HEADERS": "0"}
    assert ytp.public_base_url(headers, "http://backend:8000/", env=env) == "http://backend:8000"


def test_configured_base_url_wins():
    env = {"DEEPSPLIT_PUBLIC_BASE_URL": "https://api.deepsplit.app/"}
    headers = {"x-forwarded-host": "other.example.com"}
    assert ytp.public_base_url(headers, "http://localhost:8000/", env=env) == "https://api.deepsplit.app"
    assert ytp.public_base_url({}, "http://localhost:8000/", env={"API_BASE_URL": "not-a-url"}) == "http://localhost:8000"


def test_build_file_url_quotes_components():
    url = ytp.build_file_url("https://x.example.com/api", "processed", "id", "a b#?.wav")
    assert url == "https://x.example.com/api/processed/id/a%20b%23%3F.wav"


# ── Stem identification / Demucs planning ───────────────────────────────────
@pytest.mark.parametrize("name,stem", [
    ("vocals.wav", "vocals"), ("no_vocals.wav", "instrumental"), ("Song_drums.mp3", "drums"),
    ("Bass_Boosted_Drums_Mix_other.flac", "other"), ("Drum_and_Bass_vocals.wav", "vocals"),
    ("Song_bass_2.wav", None), ("random.wav", None), ("Song_piano.wav", "piano"),
])
def test_identify_stem_by_suffix_pattern(name, stem):
    assert ytp.identify_stem(name) == stem


def test_choose_plan_gpu_vs_cpu():
    gpu = ytp.choose_demucs_plan(4, env={}, has_cuda=True)
    assert (gpu.model, gpu.device, gpu.extra_args) == ("htdemucs", "cuda", [])
    cpu = ytp.choose_demucs_plan(4, env={}, has_cuda=False)
    assert (cpu.model, cpu.device) == ("htdemucs", "cpu")
    assert "--segment" in cpu.extra_args and "-j" in cpu.extra_args
    six = ytp.choose_demucs_plan(6, env={"DEEPSPLIT_DEMUCS_MODEL": "mdx_q"}, has_cuda=False)
    assert six.model == "htdemucs_6s"
    assert ytp.choose_demucs_plan(2, env={}, has_cuda=False).two_stems
    bad = ytp.choose_demucs_plan(4, env={"DEEPSPLIT_DEMUCS_MODEL": "rm -rf /"}, has_cuda=False)
    assert bad.model == "htdemucs"


def test_choose_plan_cpu_constrained_uses_mdx_q(monkeypatch):
    monkeypatch.setattr(ytp, "_diffq_available", lambda: True)
    plan = ytp.choose_demucs_plan(4, env={"DEEPSPLIT_CPU_CONSTRAINED": "1"}, has_cuda=False)
    assert plan.model == "mdx_q" and "--segment" not in plan.extra_args


def test_normalize_stem_count():
    assert [ytp.normalize_stem_count(n) for n in (None, 2, 4, 5, 6, 7, 3, "x")] == [4, 2, 4, 5, 6, 6, 4, 4]


# ── Separation output handling with a fake Demucs ───────────────────────────
def _write_wav(path: Path, frames: int = 4410):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(44100)
        w.writeframes(b"\x01\x00" * 2 * frames)


def _fake_demucs(stems):
    def run(wav, out_dir, plan, progress=None, timeout_s=None):
        d = out_dir / plan.model
        d.mkdir(parents=True, exist_ok=True)
        for s in stems:
            _write_wav(d / f"{s}.wav")
        return d
    return run


def test_separate_full_stems_written_with_safe_names(tmp_path, monkeypatch):
    monkeypatch.setattr(ytp, "run_demucs", _fake_demucs(["vocals", "drums", "bass", "other"]))
    out = tmp_path / "out"
    (out).mkdir()
    (out / "My_Song_vocals.wav").write_bytes(b"pre-existing")  # must not be overwritten
    stems, missing, plan, _ = ytp.separate_to_output(
        tmp_path / "in.wav", tmp_path / "work", out, "My_Song", 4, "wav",
        plan=ytp.DemucsPlan(model="htdemucs", device="cpu"))
    assert missing == []
    assert set(stems) == {"vocals", "drums", "bass", "other"}
    assert stems["vocals"] == "My_Song_vocals_2.wav"
    assert (out / "My_Song_vocals.wav").read_bytes() == b"pre-existing"


def test_separate_partial_stems_reported(tmp_path, monkeypatch):
    monkeypatch.setattr(ytp, "run_demucs", _fake_demucs(["vocals", "drums"]))
    stems, missing, _, _ = ytp.separate_to_output(
        tmp_path / "in.wav", tmp_path / "work", tmp_path / "out", "T", 4, "wav",
        plan=ytp.DemucsPlan(model="htdemucs", device="cpu"))
    assert set(stems) == {"vocals", "drums"}
    assert missing == ["bass", "other"]


def test_separate_no_stems_is_clean_error(tmp_path, monkeypatch):
    monkeypatch.setattr(ytp, "run_demucs", _fake_demucs([]))
    with pytest.raises(ytp.PipelineError, match="no stems"):
        ytp.separate_to_output(tmp_path / "in.wav", tmp_path / "work", tmp_path / "out", "T", 4, "wav",
                               plan=ytp.DemucsPlan(model="htdemucs", device="cpu"))


def test_demucs_failure_falls_back_then_errors_cleanly(tmp_path, monkeypatch):
    calls = []

    def boom(wav, out_dir, plan, progress=None, timeout_s=None):
        calls.append(plan.model)
        raise ytp.PipelineError("Stem separation (Demucs) failed. See server logs for details.")

    monkeypatch.setattr(ytp, "run_demucs", boom)
    with pytest.raises(ytp.PipelineError, match="Demucs"):
        ytp.separate_to_output(tmp_path / "in.wav", tmp_path / "work", tmp_path / "out", "T", 4, "wav",
                               plan=ytp.DemucsPlan(model="htdemucs", device="cpu", fallback_model="mdx_q"))
    assert calls == ["htdemucs", "mdx_q"]


def test_five_stem_mode_merges_piano_into_other(tmp_path, monkeypatch):
    monkeypatch.setattr(ytp, "run_demucs", _fake_demucs(["vocals", "drums", "bass", "guitar", "piano", "other"]))
    stems, missing, _, notes = ytp.separate_to_output(
        tmp_path / "in.wav", tmp_path / "work", tmp_path / "out", "T", 5, "wav",
        plan=ytp.DemucsPlan(model="htdemucs_6s", device="cpu"))
    assert missing == [] and "piano" not in stems and len(stems) == 5
    with wave.open(str(tmp_path / "out" / stems["other"]), "rb") as w:
        assert w.readframes(1)[:2] == b"\x02\x00"  # 1 + 1


def test_missing_demucs_gives_clear_error(monkeypatch):
    monkeypatch.setattr(ytp, "demucs_available", lambda: False)
    monkeypatch.setattr(ytp, "find_ffmpeg", lambda: "/usr/bin/ffmpeg")
    monkeypatch.setattr(ytp, "yt_dlp_available", lambda: True)
    with pytest.raises(ytp.PipelineError) as exc:
        ytp.check_youtube_split_dependencies()
    assert exc.value.status_code == 503 and "Demucs" in str(exc.value)


def test_run_youtube_split_rejects_bad_job_id(tmp_path):
    with pytest.raises(ValueError):
        ytp.run_youtube_split("https://youtu.be/jNQXAC9IVRw", "../../etc", tmp_path, tmp_path)


def test_build_result_payload(tmp_path):
    jid = str(uuid.uuid4())
    res = ytp.SplitResult(title="T 😀", safe_title="T", video_id="jNQXAC9IVRw", model="htdemucs", device="cpu",
                          format="wav", stems={"vocals": "T_vocals.wav"}, missing=[], notes=[])
    p = ytp.build_result_payload(jid, res, "https://stems.example.com", "stems.zip")
    assert p["stems"]["vocals"] == f"https://stems.example.com/processed/{jid}/T_vocals.wav"
    assert p["zip"] == f"https://stems.example.com/download/{jid}/stems.zip"
    assert "localhost" not in str(p)
