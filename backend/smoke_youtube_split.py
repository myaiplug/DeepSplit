#!/usr/bin/env python
"""
Smoke test for the YouTube -> yt-dlp -> WAV -> Demucs pipeline (real tools, no mocks).

Examples (from backend/):
  # Real YouTube download + split, trimmed to 20 s for speed
  python smoke_youtube_split.py --url "https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3s" --seconds 20

  # Offline: split a local file (verifies Demucs + output naming + URL generation)
  python smoke_youtube_split.py --wav ../test_wav.wav --seconds 15

Everything is written to a temp dir (or --workdir) and never into the repo.
Exit code 0 = all checks passed.
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import youtube_pipeline as ytp  # noqa: E402


def trim(src: Path, dst: Path, seconds: int) -> None:
    ffmpeg = ytp.find_ffmpeg()
    subprocess.run([ffmpeg, "-n", "-loglevel", "error", "-i", str(src), "-t", str(seconds),
                    "-ac", "2", "-ar", "44100", "-c:a", "pcm_s16le", str(dst)], check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--url", help="YouTube URL to download and split")
    src.add_argument("--wav", help="Local audio file to split (skips YouTube)")
    ap.add_argument("--seconds", type=int, default=20, help="Trim input to N seconds (0 = full)")
    ap.add_argument("--stems", type=int, default=4)
    ap.add_argument("--format", default="wav", choices=["wav", "mp3", "flac"])
    ap.add_argument("--workdir", help="Where to write files (default: temp dir, deleted unless --keep)")
    ap.add_argument("--keep", action="store_true")
    args = ap.parse_args()

    ytp.check_youtube_split_dependencies()
    root = Path(args.workdir or tempfile.mkdtemp(prefix="deepsplit-smoke-")).resolve()
    job_id = str(uuid.uuid4())
    uploads, processed = root / "uploads", root / "processed"
    src_dir = ytp.safe_join(uploads, f"yt_{job_id}")
    out_dir = ytp.safe_join(processed, job_id)
    t0 = time.time()
    progress = lambda status, pct: print(f"  [{pct:3d}%] {status}", flush=True)  # noqa: E731

    if args.url:
        parsed = ytp.parse_youtube_url(args.url)
        print(f"URL ok: video={parsed.video_id} playlist={parsed.playlist_id} -> {parsed.canonical_url}")
        target = ytp.resolve_target_video(parsed)
        source, wav, info = ytp.download_youtube_audio(target, src_dir, progress)
        title = info.get("title") or "YouTube Track"
        print(f"Downloaded: {title!r} ({info.get('duration')}s) -> {source.name}, {wav.name}")
        assert source.exists(), "source audio was not preserved"
    else:
        src_dir.mkdir(parents=True)
        wav = src_dir / "input.wav"
        trim(Path(args.wav), wav, args.seconds or 10**6)
        title = Path(args.wav).stem

    if args.seconds:
        trimmed = src_dir / f"input_{args.seconds}s.wav"
        trim(wav, trimmed, args.seconds)
        wav = trimmed

    safe_title = ytp.sanitize_filename(title)
    plan = ytp.choose_demucs_plan(ytp.normalize_stem_count(args.stems))
    print(f"Demucs plan: model={plan.model} device={plan.device} args={plan.extra_args}")
    stems, missing, plan, notes = ytp.separate_to_output(
        wav, src_dir, out_dir, safe_title, args.stems, args.format, progress, plan=plan)

    ok = True
    print(f"Stems ({time.time() - t0:.1f}s): ")
    for stem, name in stems.items():
        p = out_dir / name
        size = p.stat().st_size if p.exists() else 0
        print(f"  {stem:13s} {name}  {size} bytes")
        ok &= size > 1024
    if missing:
        print(f"MISSING stems: {missing}")
        ok = False
    for n in notes:
        print(f"note: {n}")

    # URL generation sanity: no localhost unless the request itself came from localhost.
    result = ytp.SplitResult(title=title, safe_title=safe_title, video_id=None, model=plan.model, device=plan.device,
                             format=args.format, stems=stems, missing=missing, notes=notes)
    base = ytp.public_base_url({"x-forwarded-proto": "https", "x-forwarded-host": "stems.example.com"},
                               "http://127.0.0.1:8000/", env={})
    payload = ytp.build_result_payload(job_id, result, base, "stems.zip")
    print(f"Example stem URL behind proxy: {payload['stems'].get('vocals')}")
    ok &= all(u.startswith("https://stems.example.com/") for u in payload["stems"].values())

    print("RESULT:", "PASS" if ok else "FAIL", f"(files in {root})" if (args.keep or args.workdir) else "")
    if not (args.keep or args.workdir):
        shutil.rmtree(root, ignore_errors=True)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
