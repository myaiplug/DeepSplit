import asyncio
import logging
import os
import re
import shutil
import sys
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path
import tempfile
from typing import Any, Dict, List, Optional, Tuple

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

logger = logging.getLogger("deepsplit")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


BACKEND_DIR = Path(__file__).resolve().parent


def _init_jobs_dir() -> Path:
    override = os.getenv("DEEPSPLIT_JOBS_DIR", "").strip()
    if override:
        p = Path(override).expanduser().resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    primary = (BACKEND_DIR / "temp" / "jobs").resolve()
    try:
        primary.mkdir(parents=True, exist_ok=True)
        # Ensure we can write (packaged apps may run from read-only locations).
        test = primary / ".write_test"
        test.write_text("ok", encoding="utf-8")
        test.unlink(missing_ok=True)
        return primary
    except Exception:
        fallback = (Path(tempfile.gettempdir()) / "deepsplit" / "temp" / "jobs").resolve()
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


JOBS_DIR = _init_jobs_dir()
MAX_UPLOAD_BYTES = 50 * 1024 * 1024

ALLOWED_EXTS = {".wav", ".mp3", ".flac", ".aiff", ".aif", ".m4a", ".webm", ".mp4", ".ogg"}


def _truthy_env(name: str, default: str = "") -> bool:
    val = os.getenv(name, default).strip().lower()
    return val in {"1", "true", "yes", "y", "on"}


FUNNEL_MODE = _truthy_env("DEEPSPLIT_FUNNEL_MODE", "0")
FUNNEL_STEMS = 2
FUNNEL_FORMAT = "mp3"

WAV_SAMPLE_RATE = int(os.getenv("DEEPSPLIT_WAV_SAMPLE_RATE", "44100"))
if WAV_SAMPLE_RATE not in (44100, 48000):
    WAV_SAMPLE_RATE = 44100


def _safe_job_id(job_id: str) -> str:
    job_id = job_id.strip().lower()
    if not re.fullmatch(r"[a-f0-9-]{16,64}", job_id):
        raise HTTPException(status_code=400, detail="Invalid job id")
    return job_id


def _ensure_dirs(*dirs: Path):
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class JobPaths:
    root: Path
    input_dir: Path
    work_dir: Path
    output_dir: Path
    package_dir: Path


def _job_paths(job_id: str) -> JobPaths:
    safe_job_id = _safe_job_id(job_id)
    jobs_root = JOBS_DIR.resolve()
    job_root = (jobs_root / safe_job_id).resolve()
    if not job_root.is_relative_to(jobs_root):
        raise HTTPException(status_code=400, detail="Invalid job path")
    paths = JobPaths(
        root=job_root,
        input_dir=job_root / "input",
        work_dir=job_root / "work",
        output_dir=job_root / "output",
        package_dir=job_root / "package",
    )
    _ensure_dirs(paths.input_dir, paths.work_dir, paths.output_dir, paths.package_dir)
    return paths


def _maybe_import_magic():
    try:
        import magic  # type: ignore
        return magic
    except Exception:
        return None


def _find_ffmpeg() -> Optional[str]:
    explicit = os.getenv("FFMPEG_PATH", "").strip()
    if explicit and Path(explicit).exists():
        return explicit

    candidates = [
        BACKEND_DIR / "ffmpeg" / "ffmpeg.exe",
        BACKEND_DIR / "ffmpeg" / "ffmpeg",
        BACKEND_DIR / "bin" / "ffmpeg.exe",
        BACKEND_DIR / "bin" / "ffmpeg",
        BACKEND_DIR.parent / "ffmpeg" / "ffmpeg.exe",
        BACKEND_DIR.parent / "ffmpeg" / "ffmpeg",
    ]
    for c in candidates:
        if c.exists():
            return str(c)

    return shutil.which("ffmpeg")


def _run_cmd(cmd: List[str], *, timeout_s: Optional[int] = None) -> Tuple[str, str]:
    import subprocess

    logger.info("exec: %s", " ".join(cmd))
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            text=True,
            timeout=timeout_s,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"Command timed out after {timeout_s}s: {cmd[0]}") from exc

    stdout = proc.stdout or ""
    stderr = proc.stderr or ""
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed ({proc.returncode}): {cmd[0]}\n{stderr.strip()}")
    return stdout, stderr


def _convert_to_wav(input_path: Path, output_path: Path) -> None:
    ffmpeg = _find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg not found. Install ffmpeg or set FFMPEG_PATH.")

    cmd = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-nostdin",
        "-i",
        str(input_path),
        "-vn",
        "-ac",
        "2",
        "-ar",
        str(WAV_SAMPLE_RATE),
        "-c:a",
        "pcm_s16le",
        "-af",
        "aresample=resampler=soxr",
        str(output_path),
    ]
    _run_cmd(cmd, timeout_s=60 * 20)


def _trim_audio_ffmpeg(input_path: Path, output_path: Path, start_ms: int, end_ms: int) -> None:
    ffmpeg = _find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg not found. Install ffmpeg or set FFMPEG_PATH.")

    start_sec = max(0.0, start_ms / 1000.0)
    end_sec = max(start_sec, end_ms / 1000.0)
    cmd = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-nostdin",
        "-i",
        str(input_path),
        "-ss",
        f"{start_sec:.3f}",
        "-to",
        f"{end_sec:.3f}",
        "-vn",
        "-ac",
        "2",
        "-ar",
        str(WAV_SAMPLE_RATE),
        "-c:a",
        "pcm_s16le",
        "-af",
        "aresample=resampler=soxr",
        str(output_path),
    ]
    _run_cmd(cmd, timeout_s=60 * 20)


def _yt_dlp_error_to_message(stderr: str) -> str:
    msg = (stderr or "").lower()
    if "no address associated with hostname" in msg or "temporary failure in name resolution" in msg or "name or service not known" in msg:
        return "Network error while contacting YouTube."
    if "video is unavailable" in msg or "this video is not available" in msg:
        return "This YouTube video is unavailable."
    if "private video" in msg or "this is a private video" in msg:
        return "This YouTube video is private and cannot be processed."
    if "sign in" in msg or "confirm your age" in msg or "age-restricted" in msg:
        return "This YouTube video is restricted (sign-in/age verification required)."
    if "copyright" in msg or "blocked" in msg or "not available in your country" in msg:
        return "This YouTube video is region/copyright restricted."
    return "YouTube download failed."


def _download_youtube_audio(url: str, out_dir: Path, *, allow_playlist: bool) -> List[Path]:
    import importlib.util

    if importlib.util.find_spec("yt_dlp") is None:
        raise RuntimeError("yt-dlp is not installed in this backend environment.")

    out_tmpl = str(out_dir / "%(id)s.%(ext)s")
    args = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--no-warnings",
        "--newline",
        "--no-progress",
        "-f",
        "bestaudio/best",
        "--print",
        "after_move:filepath",
        "-o",
        out_tmpl,
    ]
    if not allow_playlist:
        args.append("--no-playlist")
    try:
        stdout, _ = _run_cmd(args + [url], timeout_s=60 * 10)
    except Exception as exc:
        raise RuntimeError(_yt_dlp_error_to_message(str(exc))) from exc

    paths: List[Path] = []
    for line in (stdout or "").splitlines():
        line = line.strip()
        if not line:
            continue
        p = Path(line)
        if p.exists():
            paths.append(p)

    if not paths:
        existing = sorted(out_dir.glob("*"))
        if existing:
            paths = existing

    if not paths:
        raise RuntimeError("YouTube download produced no files.")
    return paths


def _zip_outputs(output_dir: Path, zip_path: Path) -> None:
    stem_files = [p for p in sorted(output_dir.iterdir()) if p.is_file() and p.suffix.lower() in {".mp3", ".wav", ".flac"}]
    if not stem_files:
        raise RuntimeError("No stems found to package.")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in stem_files:
            zf.write(p, arcname=p.name)


def _torch_device_info() -> Dict[str, Any]:
    try:
        import torch  # type: ignore

        if torch.cuda.is_available():
            idx = torch.cuda.current_device()
            name = torch.cuda.get_device_name(idx)
            props = torch.cuda.get_device_properties(idx)
            vram_gb = round(props.total_memory / (1024**3), 1)
            return {"device": "cuda", "gpu_name": name, "vram_gb": vram_gb}
    except Exception:
        pass
    return {"device": "cpu", "gpu_name": None, "vram_gb": None}


def _clamd_available() -> bool:
    try:
        import pyclamd  # type: ignore

        cd = pyclamd.ClamdUnixSocket()
        return bool(cd.ping())
    except Exception:
        return False


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Progress stores (best-effort, in-memory)
UPLOAD_PROGRESS: Dict[str, Dict[str, Any]] = {}
YOUTUBE_JOBS: Dict[str, Dict[str, Any]] = {}
FX_TASKS: Dict[str, Dict[str, Any]] = {}


class YouTubeRequest(BaseModel):
    url: str = Field(..., min_length=5)
    format: Optional[str] = "wav"
    num_stems: Optional[int] = 6


class ProcessRequest(BaseModel):
    file_id: str
    filename: str
    display_name: Optional[str] = None
    start_ms: int = 0
    end_ms: int = 0
    num_stems: int = 6


class FXRequest(BaseModel):
    file_id: str
    stem_name: str
    preset_id: str
    passes: int = 1
    mix: float = 1.0
    preview: bool = False


def _set_upload_progress(upload_id: str, stage: str, pct: int, *, done: bool = False, error: str = ""):
    UPLOAD_PROGRESS[upload_id] = {"stage": stage, "pct": int(pct), "done": bool(done), "error": error or ""}


def _set_yt_progress(job_id: str, status: str, progress: int, *, error: str = ""):
    cur = YOUTUBE_JOBS.get(job_id) or {}
    cur.update({"status": status, "progress": int(progress), "error": error or cur.get("error", "")})
    YOUTUBE_JOBS[job_id] = cur


@app.get("/")
async def root():
    return {"ok": True}


@app.get("/system/info")
async def system_info():
    info = _torch_device_info()
    info["ffmpeg_available"] = bool(_find_ffmpeg())
    return info


@app.get("/system/scan_status")
async def scan_status():
    return {"clamd_available": _clamd_available()}


@app.get("/upload/progress/{upload_id}")
async def upload_progress(upload_id: str):
    return UPLOAD_PROGRESS.get(upload_id, {"stage": "waiting", "pct": 0, "done": False, "error": ""})


@app.post("/upload/")
async def upload(request: Request, file: UploadFile = File(...)):
    upload_id = request.headers.get("X-Upload-ID") or str(uuid.uuid4())
    file_id = upload_id
    _set_upload_progress(upload_id, "validating", 5, done=False)

    filename = (file.filename or "upload").strip()
    ext = Path(filename).suffix.lower()
    if ext and ext not in ALLOWED_EXTS:
        _set_upload_progress(upload_id, "error", 100, done=True, error="Unsupported file type.")
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    paths = _job_paths(_safe_job_id(file_id))
    dest = paths.input_dir / filename

    _set_upload_progress(upload_id, "saving", 25, done=False)
    written = 0
    with dest.open("wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > MAX_UPLOAD_BYTES:
                _set_upload_progress(upload_id, "error", 100, done=True, error="File too large (max 50 MB).")
                raise HTTPException(status_code=413, detail="File too large (max 50 MB).")
            f.write(chunk)

    magic_mod = _maybe_import_magic()
    if magic_mod:
        _set_upload_progress(upload_id, "validating", 45, done=False)
        try:
            mime = magic_mod.from_file(str(dest), mime=True)
            if mime and not str(mime).startswith("audio/") and mime not in {"application/octet-stream", "video/webm"}:
                _set_upload_progress(upload_id, "error", 100, done=True, error="Invalid audio file.")
                raise HTTPException(status_code=400, detail="Invalid audio file.")
        except HTTPException:
            raise
        except Exception:
            # If libmagic isn't available on the host, fall back to extension validation only.
            pass

    _set_upload_progress(upload_id, "complete", 100, done=True)
    base = str(request.base_url).rstrip("/")
    return {
        "file_id": file_id,
        "filename": filename,
        "url": f"{base}/uploads/{file_id}_{filename}",
        "size_bytes": written,
    }


@app.api_route("/uploads/{file_token}", methods=["GET", "HEAD"])
async def get_upload(file_token: str):
    if "_" not in file_token:
        raise HTTPException(status_code=404, detail="Not found")
    file_id, filename = file_token.split("_", 1)
    paths = _job_paths(_safe_job_id(file_id))
    src = (paths.input_dir / filename).resolve()
    if not src.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(src)


@app.api_route("/processed/{file_id}/{filename}", methods=["GET", "HEAD"])
async def get_processed(file_id: str, filename: str):
    paths = _job_paths(_safe_job_id(file_id))
    p = (paths.output_dir / filename).resolve()
    if not p.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(p)


@app.get("/download/{file_id}/{filename}")
async def download_file(file_id: str, filename: str):
    paths = _job_paths(_safe_job_id(file_id))
    for base in (paths.package_dir, paths.output_dir, paths.input_dir):
        p = (base / filename).resolve()
        if p.exists():
            return FileResponse(p, filename=filename)
    raise HTTPException(status_code=404, detail="Not found")


@app.get("/files/{file_id}")
async def list_files(request: Request, file_id: str):
    paths = _job_paths(_safe_job_id(file_id))
    base = str(request.base_url).rstrip("/")
    files: List[Dict[str, Any]] = []
    for p in sorted(paths.output_dir.glob("*")):
        if not p.is_file():
            continue
        files.append(
            {
                "filename": p.name,
                "url": f"{base}/processed/{file_id}/{p.name}",
                "size_bytes": p.stat().st_size,
            }
        )
    for p in sorted(paths.package_dir.glob("*.zip")):
        files.append(
            {
                "filename": p.name,
                "url": f"{base}/download/{file_id}/{p.name}",
                "size_bytes": p.stat().st_size,
            }
        )
    return {"files": files}


@app.get("/progress/{file_id}")
async def youtube_progress(file_id: str):
    return YOUTUBE_JOBS.get(file_id, {"status": "initializing", "progress": 0, "error": ""})


async def _run_youtube_job(job_id: str, url: str, req_format: str, req_stems: int):
    paths = _job_paths(_safe_job_id(job_id))
    allow_playlist = not FUNNEL_MODE

    num_stems = int(req_stems or 6)
    out_format = (req_format or "wav").lower()
    if out_format not in {"wav", "mp3", "flac"}:
        out_format = "wav"

    if FUNNEL_MODE:
        num_stems = FUNNEL_STEMS
        out_format = FUNNEL_FORMAT

    _set_yt_progress(job_id, "downloading", 5)
    try:
        downloaded = await asyncio.to_thread(_download_youtube_audio, url, paths.work_dir, allow_playlist=allow_playlist)
        src = downloaded[0]
        _set_yt_progress(job_id, "downloading", 30)

        wav_path = paths.work_dir / "input.wav"
        # Keep UI status labels stable: conversion is part of "downloading" for now.
        _set_yt_progress(job_id, "downloading", 40)
        await asyncio.to_thread(_convert_to_wav, src, wav_path)

        _set_yt_progress(job_id, "separating", 55)
        from separator import AudioSeparator  # local import: heavy deps

        separator = AudioSeparator(use_gpu=True)
        stems = await separator.separate_stems(
            audio_path=wav_path,
            output_dir=paths.output_dir,
            original_filename=f"youtube_{job_id}.wav",
            num_stems=num_stems,
            output_format=out_format,
            model_type="auto",
        )

        _set_yt_progress(job_id, "packaging", 90)
        zip_path = paths.package_dir / "stems.zip"
        await asyncio.to_thread(_zip_outputs, paths.output_dir, zip_path)

        _set_yt_progress(job_id, "done", 100)
        YOUTUBE_JOBS[job_id]["stems"] = stems
    except Exception as exc:
        logger.exception("YouTube job failed: %s", exc)
        _set_yt_progress(job_id, "failed", 100, error=str(exc))


@app.post("/process_youtube/")
async def process_youtube(req: YouTubeRequest):
    job_id = str(uuid.uuid4())
    _job_paths(_safe_job_id(job_id))
    _set_yt_progress(job_id, "initializing", 1)
    asyncio.create_task(_run_youtube_job(job_id, req.url, req.format or "wav", int(req.num_stems or 6)))
    return {"file_id": job_id}


async def _run_local_process(req: ProcessRequest):
    file_id = _safe_job_id(req.file_id)
    paths = _job_paths(file_id)
    src = (paths.input_dir / req.filename).resolve()
    if not src.exists():
        logger.error("Missing input for job %s: %s", file_id, src)
        return

    try:
        if req.end_ms and req.end_ms > req.start_ms:
            wav_in = paths.work_dir / "trimmed.wav"
            await asyncio.to_thread(_trim_audio_ffmpeg, src, wav_in, int(req.start_ms), int(req.end_ms))
        else:
            wav_in = paths.work_dir / "input.wav"
            await asyncio.to_thread(_convert_to_wav, src, wav_in)

        from separator import AudioSeparator  # local import: heavy deps

        separator = AudioSeparator(use_gpu=True)
        await separator.separate_stems(
            audio_path=wav_in,
            output_dir=paths.output_dir,
            original_filename=req.filename,
            num_stems=int(req.num_stems or 6),
            output_format="mp3",
            model_type="auto",
        )
        await asyncio.to_thread(_zip_outputs, paths.output_dir, paths.package_dir / "stems.zip")
    except Exception:
        logger.exception("Local processing failed for %s", file_id)


@app.post("/process/")
async def process_file(req: ProcessRequest):
    asyncio.create_task(_run_local_process(req))
    return {"ok": True}


@app.get("/presets/{stem_name}")
async def presets(stem_name: str, file_id: Optional[str] = None):
    # Keep API stable for frontend; output_dir only needed for actual processing.
    from fx_engine import FXEngine  # local import: optional deps

    return FXEngine(BACKEND_DIR).get_presets_for_stem(stem_name)


def _fx_task_key() -> str:
    return uuid.uuid4().hex


async def _run_fx(file_id: str, stem_name: str, preset_id: str, passes: int, mix: float, preview: bool, task_key: str):
    FX_TASKS[task_key] = {"progress": 0}
    try:
        paths = _job_paths(_safe_job_id(file_id))
        stem_label = (stem_name or "").strip().lower()
        # Frontend passes logical names like "Vocals", so match by suffix.
        candidates = list(paths.output_dir.glob(f"*_{stem_label}.mp3")) + list(paths.output_dir.glob(f"*_{stem_label}.wav")) + list(paths.output_dir.glob(f"*_{stem_label}.flac"))
        if not candidates:
            raise RuntimeError("Stem file not found.")
        stem_path = candidates[0].resolve()

        from fx_engine import FXEngine  # local import: optional deps

        engine = FXEngine(paths.output_dir)
        if preview:
            out_path = (paths.output_dir / f"{stem_label}_preview{stem_path.suffix}").resolve()
        else:
            out_path = stem_path

        def progress_cb(pct: int):
            FX_TASKS[task_key] = {"progress": int(pct)}

        await asyncio.to_thread(
            engine.process_fx,
            str(stem_path),
            str(out_path),
            preset_id,
            passes,
            mix,
            preview,
            progress_cb,
        )
        FX_TASKS[task_key] = {"progress": 100}
    except Exception:
        logger.exception("FX processing failed")
        FX_TASKS[task_key] = {"progress": -1}


@app.post("/process_fx/")
async def process_fx(req: FXRequest):
    task_key = _fx_task_key()
    asyncio.create_task(_run_fx(req.file_id, req.stem_name, req.preset_id, req.passes, req.mix, req.preview, task_key))
    return {"task_key": task_key}


@app.get("/fx_progress/{task_key}")
async def fx_progress(task_key: str):
    return FX_TASKS.get(task_key, {"progress": 0})
