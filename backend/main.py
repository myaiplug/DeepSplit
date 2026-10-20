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
    if not re.fullmatch(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", job_id):
        raise HTTPException(status_code=400, detail="Invalid job id")
    return job_id


def _safe_child_path(base_dir: Path, user_name: str) -> Path:
    candidate = user_name.strip()
    if not candidate or candidate in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if Path(candidate).name != candidate:
        raise HTTPException(status_code=400, detail="Invalid filename")
    base_resolved = base_dir.resolve()
    child = (base_resolved / candidate).resolve()
    if not child.is_relative_to(base_resolved):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return child


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

import logging
import sys
import os
import asyncio
import time
import shutil
import uuid
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List
from urllib.parse import quote

# ── Dynamic log path ───────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).parent.resolve()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(str(_BASE_DIR / "backend.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
logger.info("Backend starting...")
logger.info(f"Python executable: {sys.executable}")
logger.info(f"CWD: {os.getcwd()}")
logger.info(f"Base dir: {_BASE_DIR}")

try:
    from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Request
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse, JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import magic

    # Rate limiting
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware

    from separator import AudioSeparator
    from utils import trim_audio

    try:
        from fx_engine import FXEngine
    except ImportError:
        logger.warning("FX Engine not available (missing dependencies?)")
        FXEngine = None

except Exception as e:
    logger.critical(f"Import error: {e}", exc_info=True)
    raise e

# ── ClamAV setup (optional — graceful degradation) ─────────────────────────
try:
    import pyclamd
    _clamd = pyclamd.ClamdUnixSocket() if sys.platform != "win32" else pyclamd.ClamdNetworkSocket(host="127.0.0.1", port=3310, timeout=1)
    _clamd.ping()
    CLAMD_AVAILABLE = True
    logger.info("ClamAV daemon reachable — virus scanning ACTIVE.")
except Exception as _clamav_err:
    _clamd = None
    CLAMD_AVAILABLE = False
    logger.warning(
        f"ClamAV daemon not reachable ({_clamav_err}). "
        "Virus scanning DISABLED. Install ClamAV and start clamd to enable."
    )

# ── Rate limiter ───────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    global fx_engine, gpu_separator, separation_lock, FFMPEG_AVAILABLE
    separation_lock = asyncio.Lock()
    gpu_separator = AudioSeparator(use_gpu=True)
    
    FFMPEG_AVAILABLE = bool(shutil.which("ffmpeg"))
    if not FFMPEG_AVAILABLE:
        logger.warning("FFMPEG not found on PATH. Audio mixdown/export will fail.")
    else:
        logger.info("FFMPEG detected.")

    if FXEngine:
        try:
            fx_engine = FXEngine(PROCESSED_DIR)
            logger.info("FX Engine initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize FX Engine: {e}")
            
    asyncio.create_task(cleanup_loop())
    logger.info("TTL cleanup scheduler started.")
    
    yield
    # Cleanup on shutdown could go here
    logger.info("Lifespan shutting down.")

# ── App setup ─────────────────────────────────────────────────────────────
app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

UPLOAD_DIR = _BASE_DIR / "uploads"
PROCESSED_DIR = _BASE_DIR / "processed"
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

# ── Constants ──────────────────────────────────────────────────────────────
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024   # 50 MB
UPLOAD_TTL_SECONDS  = 24 * 60 * 60       # 24 hours
CLEANUP_INTERVAL    = 60 * 60            # 1 hour

ALLOWED_MIMES = {
    "audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac",
    "audio/mp4",  "audio/x-m4a", "audio/ogg", "audio/aiff", "audio/x-aiff",
    # libmagic occasionally returns this for valid audio on some systems
    "application/octet-stream",
}
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aiff"}
ALLOWED_OUTPUT_FORMATS = {"mp3", "wav", "flac"}

# ── In-memory state ────────────────────────────────────────────────────────
fx_progress:         dict = {}   # task_key -> int
processing_progress: dict = {}   # file_id  -> {progress, status, error}
upload_progress:     dict = {}   # upload_id -> {stage, pct, done, error}
fx_engine                = None

# ── CORS ───────────────────────────────────────────────────────────────────
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
    src = _safe_child_path(paths.input_dir, filename)
    if not src.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(src)


@app.api_route("/processed/{file_id}/{filename}", methods=["GET", "HEAD"])
async def get_processed(file_id: str, filename: str):
    paths = _job_paths(_safe_job_id(file_id))
    p = _safe_child_path(paths.output_dir, filename)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(p)


@app.get("/download/{file_id}/{filename}")
async def download_file(file_id: str, filename: str):
    paths = _job_paths(_safe_job_id(file_id))
    for base in (paths.package_dir, paths.output_dir, paths.input_dir):
        p = _safe_child_path(base, filename)
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
    src = _safe_child_path(paths.input_dir, req.filename)
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
# ── Lifecycle ──────────────────────────────────────────────────────────────
gpu_separator = None
separation_lock = None
FFMPEG_AVAILABLE = False

# ── TTL Cleanup ────────────────────────────────────────────────────────────
async def cleanup_loop():
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL)
        await asyncio.to_thread(run_cleanup)

def run_cleanup():
    now, cutoff, removed = time.time(), time.time() - UPLOAD_TTL_SECONDS, 0
    for f in UPLOAD_DIR.iterdir():
        if f.is_file() and f.stat().st_mtime < cutoff:
            try: f.unlink(); removed += 1
            except Exception as e: logger.warning(f"Cleanup: {f}: {e}")
    for d in PROCESSED_DIR.iterdir():
        if d.is_dir() and d.stat().st_mtime < cutoff:
            try: shutil.rmtree(d); removed += 1
            except Exception as e: logger.warning(f"Cleanup: {d}: {e}")
    if removed:
        logger.info(f"TTL cleanup removed {removed} item(s).")

# ── Pydantic models ────────────────────────────────────────────────────────
class ProcessRequest(BaseModel):
    file_id:      str
    filename:     str
    display_name: Optional[str] = None
    start_ms:     Optional[int] = None
    end_ms:       Optional[int] = None
    num_stems:    int = 6

class YoutubeSplitRequest(BaseModel):
    url:       str
    format:    str = "wav"
    num_stems: int = 6

class FXRequest(BaseModel):
    file_id:   str
    filename:  str
    preset_id: str
    passes:    int = 1
    mix:       float = 1.0
    preview:   bool = False

class YoutubeSplitApiRequest(BaseModel):
    url: str

# ── Upload validation helpers ──────────────────────────────────────────────
def _validate_upload(filename: str, header_bytes: bytes, file_size: int) -> None:
    """Raises HTTPException on size, extension, or MIME type violation."""
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum is 50 MB. Your file is {file_size/(1024*1024):.1f} MB."
        )
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported extension '{ext}'. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )
    detected_mime = magic.from_buffer(header_bytes, mime=True)
    logger.info(f"MIME detected for '{filename}': {detected_mime}")
    if detected_mime not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"File content does not match an accepted audio format. "
                f"Detected: '{detected_mime}'. Rename tricks won't work — we check the actual bytes."
            )
        )

def _scan_for_malware(file_bytes: bytes, filename: str) -> None:
    """
    Scans bytes via ClamAV daemon. Raises HTTPException 422 if a threat is found.
    If ClamAV is not reachable, logs a warning and allows the file through.
    """
    if not CLAMD_AVAILABLE or _clamd is None:
        logger.warning(f"Skipping virus scan for '{filename}' — ClamAV not available.")
        return
    try:
        result = _clamd.instream(bytes(file_bytes))
        status = result.get("stream", ("OK", ""))[0]
        if status == "FOUND":
            virus_name = result["stream"][1]
            logger.error(f"MALWARE DETECTED in '{filename}': {virus_name}")
            raise HTTPException(
                status_code=422,
                detail=f"File rejected: malware detected ({virus_name}). Upload blocked."
            )
        elif status == "ERROR":
            logger.warning(f"ClamAV scan error for '{filename}': {result['stream'][1]}")
        else:
            logger.info(f"ClamAV scan clean for '{filename}'.")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"ClamAV scan failed unexpectedly for '{filename}': {e}. Allowing file.")

# ── Static mounts ──────────────────────────────────────────────────────────
app.mount("/uploads",   StaticFiles(directory=str(UPLOAD_DIR)),   name="uploads")
app.mount("/processed", StaticFiles(directory=str(PROCESSED_DIR)), name="processed")

# ── Info routes ────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "DeepSplit API is running"}

@app.get("/system/info")
@limiter.limit("30/minute")
def get_system_info(request: Request):
    try:
        import torch
        if torch.cuda.is_available():
            idx = torch.cuda.current_device()
            return {
                "device":   "cuda",
                "gpu_name": torch.cuda.get_device_name(idx),
                "vram_gb":  round(torch.cuda.get_device_properties(idx).total_memory / (1024**3), 1),
                "ffmpeg_available": FFMPEG_AVAILABLE
            }
    except ImportError:
        pass
    return {
        "device": "cpu",
        "gpu_name": None,
        "vram_gb": None,
        "ffmpeg_available": FFMPEG_AVAILABLE
    }

@app.get("/system/scan_status")
def get_scan_status():
    """Returns whether ClamAV virus scanning is active."""
    return {
        "clamd_available": CLAMD_AVAILABLE,
        "message": "Virus scanning ACTIVE" if CLAMD_AVAILABLE else
                   "ClamAV not found — scanning disabled. Install ClamAV and start clamd to enable."
    }

@app.get("/progress/{file_id}")
@limiter.limit("60/minute")
def get_progress(file_id: str, request: Request):
    info = processing_progress.get(file_id, {"progress": 0, "status": "processing", "error": None})
    return info

@app.get("/files/{file_id}")
def get_processed_files(file_id: str, request: Request):
    try:
        safe_file_id = str(uuid.UUID(file_id.strip()))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    dir_path = PROCESSED_DIR / safe_file_id
    if not dir_path.exists() or not dir_path.is_dir():
        raise HTTPException(status_code=404, detail="Processed directory not found")

    base_url = str(request.base_url).rstrip("/")
    files = []
    for f in sorted(dir_path.iterdir()):
        if f.is_file():
            files.append({
                "filename": f.name,
                "url": f"{base_url}/processed/{safe_file_id}/{quote(f.name)}"
            })
    return {"files": files}

@app.get("/download/{file_id}/{filename}")
@limiter.limit("30/minute")
def download_stem(file_id: str, filename: str, request: Request):
    """
    Serves a processed stem file with Content-Disposition: attachment so browsers
    trigger a save dialog instead of streaming inline.
    """
    # Sanitize to prevent path traversal
    safe_name = Path(filename).name
    file_path = (PROCESSED_DIR / file_id / safe_name).resolve()
    # Ensure the resolved path is still inside PROCESSED_DIR (guards against ../ in file_id)
    try:
        file_path.relative_to(PROCESSED_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=str(file_path),
        filename=safe_name,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )

@app.get("/presets/{stem_name}")
def get_presets(stem_name: str):
    if not fx_engine:
        raise HTTPException(status_code=503, detail="FX Engine not available (missing dependencies?)")
    # For precise stem identification, we can extract the keyword from the filename
    return fx_engine.get_presets_for_stem(stem_name)

@app.get("/fx_progress/{task_key}")
def get_fx_progress(task_key: str):
    prog = fx_progress.get(task_key, 0)
    return {"progress": prog}

# ── Upload progress endpoint ───────────────────────────────────────────────
@app.get("/upload/progress/{upload_id}")
@limiter.limit("120/minute")
def get_upload_progress(upload_id: str, request: Request):
    """
    Returns server-side upload stage and completion percentage.
    Stages: uploading | scanning | finalizing | complete | error
    pct: 0-100 (server-side view, separate from client XHR bytes)
    """
    info = upload_progress.get(upload_id)
    if not info:
        # Return a neutral response instead of 404 while XHR hasn't registered yet
        return {"stage": "waiting", "pct": 0, "done": False, "error": None}
    return info

# ── Upload endpoint ────────────────────────────────────────────────────────
@app.post("/upload/")
@limiter.limit("2/minute")   # 1 real upload per 30 seconds effectively; 2/min is cleaner
async def upload_audio(request: Request, file: UploadFile = File(...)):
    """
    Production upload endpoint:
    - 50 MB streaming size cap (checked on every chunk, disk never touched if exceeded)
    - MIME validation via libmagic
    - ClamAV virus scan (if daemon running)
    - Server-side progress tracking via X-Upload-ID header
    """
    upload_id = request.headers.get("X-Upload-ID", str(uuid.uuid4()))
    filename  = file.filename or "unknown"

    # Register progress entry immediately
    upload_progress[upload_id] = {"stage": "uploading", "pct": 0, "done": False, "error": None}

    CHUNK = 65_536  # 64 KB
    chunks: List[bytes] = []
    total = 0
    header_bytes: Optional[bytes] = None

    # ── 1. Stream in + enforce size cap ───────────────────────────────────
    while True:
        chunk = await file.read(CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if header_bytes is None:
            header_bytes = chunk
        if total > MAX_FILE_SIZE_BYTES:
            upload_progress[upload_id] = {
                "stage": "error", "pct": 0, "done": True,
                "error": f"File too large. Maximum is 50 MB."
            }
            raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 50 MB.")
        chunks.append(chunk)
        # Update server-side upload pct (capped at 70 — rest reserved for scan)
        pct = min(int((total / MAX_FILE_SIZE_BYTES) * 70), 70)
        upload_progress[upload_id]["pct"] = pct

    if not header_bytes:
        upload_progress[upload_id] = {"stage": "error", "pct": 0, "done": True, "error": "Empty file."}
        raise HTTPException(status_code=400, detail="Empty file received.")

    # ── 2. MIME + extension validation ────────────────────────────────────
    upload_progress[upload_id]["stage"] = "validating"
    upload_progress[upload_id]["pct"]   = 72
    try:
        _validate_upload(filename, header_bytes, total)
    except HTTPException as e:
        upload_progress[upload_id] = {"stage": "error", "pct": 72, "done": True, "error": e.detail}
        raise

    # ── 3. Virus / malware scan ───────────────────────────────────────────
    upload_progress[upload_id]["stage"] = "scanning"
    upload_progress[upload_id]["pct"]   = 80
    file_bytes = b"".join(chunks)
    try:
        await asyncio.to_thread(_scan_for_malware, file_bytes, filename)
    except HTTPException as e:
        upload_progress[upload_id] = {"stage": "error", "pct": 80, "done": True, "error": e.detail}
        raise

    # ── 4. Write to disk ──────────────────────────────────────────────────
    upload_progress[upload_id]["stage"] = "finalizing"
    upload_progress[upload_id]["pct"]   = 92

    file_id   = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}_{filename}"
    await asyncio.to_thread(_write_file, file_path, file_bytes)

    # ── 5. Complete ───────────────────────────────────────────────────────
    upload_progress[upload_id] = {"stage": "complete", "pct": 100, "done": True, "error": None}
    logger.info(f"Upload OK: '{filename}' ({total/(1024*1024):.2f} MB) → {file_path.name}")

    return {
        "file_id":    file_id,
        "filename":   filename,
        "size_bytes": total,
        "upload_id":  upload_id,
        "url":        f"{str(request.base_url).rstrip('/')}/uploads/{quote(f'{file_id}_{filename}')}",
        "status":     "uploaded",
        "scan":       "clean" if CLAMD_AVAILABLE else "skipped",
    }

def _write_file(path: Path, data: bytes):
    with open(path, "wb") as f:
        f.write(data)

def _package_stems_as_zip(output_dir: Path, archive_name: str = "stems.zip") -> Optional[Path]:
    """
    Create a zip archive of all files in output_dir without including prior archives.
    Returns the final archive path or None if the directory is missing.
    """
    if not output_dir.exists():
        return None
    base = archive_name[:-4] if archive_name.lower().endswith(".zip") else archive_name
    existing = output_dir / f"{base}.zip"
    if existing.exists():
        try:
            existing.unlink()
        except Exception:
            pass
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_base = Path(tmpdir) / base
        archive_path = shutil.make_archive(str(archive_base), "zip", root_dir=output_dir)
        final_path = output_dir / f"{base}.zip"
        shutil.move(archive_path, final_path)
        return final_path

# ── Process endpoint ───────────────────────────────────────────────────────
@app.post("/process/")
@limiter.limit("1/minute")
async def process_audio_endpoint(request: Request, req: ProcessRequest, background_tasks: BackgroundTasks):
    if req.start_ms is not None and req.end_ms is not None:
        if req.start_ms >= req.end_ms:
            raise HTTPException(status_code=400, detail="start_ms must be less than end_ms")
        if req.end_ms - req.start_ms < 3000:
            raise HTTPException(status_code=400, detail="Selected region must be at least 3 seconds long")

    background_tasks.add_task(
        process_audio_task,
        req.file_id, req.filename, req.start_ms, req.end_ms, req.num_stems,
    )
    return {"file_id": req.file_id, "status": "processing_started"}

@app.post("/api/youtube-split")
@limiter.limit("2/minute")
async def youtube_split_api(request: Request, req: YoutubeSplitApiRequest):
    """
    Synchronous YouTube → WAV → 4-stem Demucs split.
    Returns direct URLs for vocals, drums, bass, and other stems.
    """
    url = (req.url or "").strip()
    if not url.startswith(("http://", "https://")) or "youtu" not in url.lower():
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")
    if not FFMPEG_AVAILABLE:
        raise HTTPException(status_code=503, detail="FFmpeg is not available on the server.")

    try:
        import yt_dlp   # Lazy import to keep cold start fast
    except Exception as e:
        logger.error(f"yt-dlp import failed: {e}")
        raise HTTPException(status_code=500, detail="YouTube downloader unavailable.")

    file_id = str(uuid.uuid4())
    processing_progress[file_id] = {"progress": 0, "status": "downloading", "error": None}

    output_dir = PROCESSED_DIR / file_id
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    download_base = UPLOAD_DIR / file_id
    download_wav  = UPLOAD_DIR / f"{file_id}.wav"

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": str(download_base) + ".%(ext)s",
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "wav",
            "preferredquality": "0",
        }],
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }

    try:
        logger.info(f"[YouTubeSplit] Downloading: {url}")

        def extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=True)

        info = await asyncio.to_thread(extract)
        if not info:
            raise HTTPException(status_code=400, detail="Failed to download audio from YouTube.")

        # Handle playlist vs single video
        if "entries" in info and info.get("entries"):
            info = next((e for e in info["entries"] if e), info["entries"][0])

        title = (info.get("title") or "YouTube Track").strip()
        safe_title = "".join(c for c in title if c.isalnum() or c in (" ", "-", "_")).strip() or "YouTube Track"

        if not download_wav.exists():
            # yt-dlp sometimes leaves original extension; try to locate
            candidates = list(UPLOAD_DIR.glob(f"{file_id}.*"))
            if candidates:
                src = candidates[0]
                await asyncio.to_thread(shutil.move, src, download_wav)

        if not download_wav.exists():
            raise HTTPException(status_code=500, detail="YouTube download failed to produce audio.")

        processing_progress[file_id]["status"] = "separating"
        processing_progress[file_id]["progress"] = 40

        def progress_cb(pct_or_dict):
            try:
                val = pct_or_dict.get("progress", pct_or_dict.get("percent", pct_or_dict))
            except Exception:
                val = pct_or_dict
            try:
                processing_progress[file_id]["progress"] = min(90, int(float(val)))
            except Exception:
                pass

        async with separation_lock:
            await gpu_separator.separate_stems(
                download_wav,
                output_dir=output_dir,
                original_filename=safe_title,
                num_stems=4,
                output_format="wav",
                progress_callback=progress_cb,
            )

        processing_progress[file_id]["status"] = "packaging"
        processing_progress[file_id]["progress"] = 95
        await asyncio.to_thread(_package_stems_as_zip, output_dir)

        # Build stem URLs
        base_url = str(request.base_url).rstrip("/")
        def stem_url(name: str) -> str:
            return f"{base_url}/processed/{file_id}/{name}"

        stem_map = {"vocals": None, "drums": None, "bass": None, "other": None}
        for f in output_dir.iterdir():
            if not f.is_file():
                continue
            lower = f.name.lower()
            if lower.endswith((".wav", ".mp3", ".flac")):
                if "_vocals." in lower:
                    stem_map["vocals"] = stem_url(f.name)
                elif "_drums." in lower or "_drum." in lower:
                    stem_map["drums"] = stem_url(f.name)
                elif "_bass." in lower:
                    stem_map["bass"] = stem_url(f.name)
                elif "_other." in lower:
                    stem_map["other"] = stem_url(f.name)

        stems_found = {k: v for k, v in stem_map.items() if v}
        if len(stems_found) < 4:
            logger.error(f"[YouTubeSplit] Missing expected stems: {stem_map}")
            raise HTTPException(status_code=500, detail="Stem separation did not produce all 4 stems.")

        zip_path = output_dir / "stems.zip"
        processing_progress[file_id]["status"] = "done"
        processing_progress[file_id]["progress"] = 100

        return {
            "file_id": file_id,
            "title": safe_title,
            "stems": stem_map,
            "zip": stem_url(zip_path.name) if zip_path.exists() else None,
        }

    except HTTPException as e:
        processing_progress[file_id]["status"] = "failed"
        processing_progress[file_id]["error"]  = getattr(e, "detail", str(e))
        if output_dir.exists():
            try: shutil.rmtree(output_dir)
            except Exception: pass
        raise e
    except Exception as e:
        logger.error(f"[YouTubeSplit] Unexpected failure: {e}", exc_info=True)
        processing_progress[file_id]["status"] = "failed"
        processing_progress[file_id]["error"]  = str(e)
        if output_dir.exists():
            try: shutil.rmtree(output_dir)
            except Exception: pass
        raise HTTPException(status_code=500, detail="Unexpected error during YouTube split.")
    finally:
        try:
            if download_wav.exists():
                download_wav.unlink()
        except Exception:
            pass
@app.post("/process_youtube/")
@limiter.limit("1/minute")
async def process_youtube_endpoint(request: Request, req: YoutubeSplitRequest, background_tasks: BackgroundTasks):
    output_format = (req.format or "wav").lower()
    if output_format not in ALLOWED_OUTPUT_FORMATS:
        raise HTTPException(status_code=400, detail="Unsupported format. Choose mp3, wav, or flac.")

    file_id = str(uuid.uuid4())
    processing_progress[file_id] = {"progress": 0, "status": "initializing", "error": None}
    
    background_tasks.add_task(
        process_youtube_task,
        file_id, req.url, output_format, req.num_stems
    )
    return {"file_id": file_id, "status": "processing_started"}

@app.post("/process_fx/")
@limiter.limit("5/minute")
async def process_fx_endpoint(request: Request, req: FXRequest, background_tasks: BackgroundTasks):
    if not fx_engine:
        raise HTTPException(status_code=503, detail="FX Engine not available")
    
    task_key = f"{req.file_id}_{req.filename}_{'preview' if req.preview else 'full'}"
    background_tasks.add_task(process_fx_task, task_key, req)
    return {"task_key": task_key, "status": "fx_processing_started"}

async def process_fx_task(task_key: str, req: FXRequest):
    fx_progress[task_key] = 0
    try:
        output_dir = PROCESSED_DIR / req.file_id
        input_path = output_dir / req.filename
        
        if not input_path.exists():
            logger.error(f"Cannot find target file '{req.filename}' for file {req.file_id}")
            fx_progress[task_key] = -1
            return
            
        if req.preview:
            output_name = input_path.stem + "_preview.mp3"
        else:
            output_name = input_path.stem + "_fx.mp3"
            
        output_path = output_dir / output_name

        def cb(p):
            fx_progress[task_key] = p
            
        await asyncio.to_thread(
            fx_engine.process_fx,
            str(input_path), str(output_path), req.preset_id, req.passes, req.mix, req.preview, cb
        )
        fx_progress[task_key] = 100
        
        # If it's a full apply, overwrite the original stem file or update a state.
        # usually we just let frontend play the new _fx file. 
        if not req.preview:
            # Optionally overwrite original to make it persistent:
            import shutil
            shutil.copy2(output_path, input_path)
            
    except Exception as e:
        logger.error(f"FX processing failed: {e}", exc_info=True)
        fx_progress[task_key] = -1

async def process_audio_task(
    file_id: str,
    filename: str,
    start_ms: Optional[int],
    end_ms: Optional[int],
    num_stems: int = 6,
):
    processing_progress[file_id] = {"progress": 0, "status": "processing", "error": None}
    original_path = UPLOAD_DIR / f"{file_id}_{filename}"
    process_path  = original_path

    if start_ms is not None and end_ms is not None:
        trimmed_stem = UPLOAD_DIR / f"{file_id}_trimmed"
        trimmed_actual = await asyncio.to_thread(trim_audio, original_path, trimmed_stem, start_ms, end_ms)
        process_path = trimmed_actual

    output_dir = PROCESSED_DIR / file_id
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(exist_ok=True)

    # AudioSeparator caching prevents large re-allocations on GPU. 
    # Use global separation lock to prevent out-of-memory concurrency errors.

    def progress_cb(pct_or_dict):
        if hasattr(pct_or_dict, "get"):
            val = pct_or_dict.get("progress", pct_or_dict.get("percent", 0))
        else:
            val = pct_or_dict
        processing_progress[file_id]["progress"] = int(float(val))

    try:
        stem_name = Path(filename).stem
        async with separation_lock:
            await gpu_separator.separate_stems(
                process_path,
                output_dir=output_dir,
                original_filename=stem_name,
                num_stems=num_stems,
                progress_callback=progress_cb,
            )
        processing_progress[file_id]["status"] = "packaging"
        processing_progress[file_id]["progress"] = 95
        await asyncio.to_thread(_package_stems_as_zip, output_dir)
        processing_progress[file_id]["status"]   = "done"
        processing_progress[file_id]["progress"] = 100
    except Exception as e:
        logger.error(f"Processing failed for {file_id}: {e}", exc_info=True)
        processing_progress[file_id]["status"] = "failed"
        processing_progress[file_id]["error"]  = str(e)
        # Clean up partial output
        if output_dir.exists():
            try:
                shutil.rmtree(output_dir)
            except Exception:
                pass

async def process_youtube_task(
    file_id: str,
    url: str,
    output_format: str,
    num_stems: int,
):
    import yt_dlp
    processing_progress[file_id] = {"progress": 0, "status": "downloading", "error": None}
    requested_format = (output_format or "wav").lower()
    if requested_format not in ALLOWED_OUTPUT_FORMATS:
        requested_format = "wav"
    
    # Download path template. %(autonumber)s ensures unique names for playlist items.
    download_tmpl = UPLOAD_DIR / f"{file_id}_%(autonumber)s_%(title)s"
    download_ext = f".{requested_format}"

    def ydl_hook(d):
        if d['status'] == 'downloading':
            p = d.get('_percent_str', '0%').replace('%','')
            try:
                # Map 0-100 download to 0-30 of total progress
                current_p = int(float(p) * 0.3)
                # Take max in case of multiple files downloading to avoid backwards progress
                if current_p > processing_progress[file_id].get("progress", 0):
                    processing_progress[file_id]["progress"] = current_p
            except Exception:
                pass
        elif d['status'] == 'finished':
            processing_progress[file_id]["progress"] = 30

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(download_tmpl),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': requested_format,
            'preferredquality': '0' if requested_format in {"wav", "flac"} else '320',
        }],
        'progress_hooks': [ydl_hook],
        'quiet': True,
        'no_warnings': True,
        'ignoreerrors': True, # continue on playlist error
    }

    try:
        logger.info(f"Downloading YouTube audio (or playlist): {url}")
        
        def extract_and_download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=True)
                
        info = await asyncio.to_thread(extract_and_download)
        if not info:
            raise RuntimeError("YouTube download failed - no info returned.")

        # `info` could be a single video or a playlist
        entries = info.get('entries') if 'entries' in info else [info]
        entries = [e for e in entries if e is not None]
        
        if not entries:
            raise RuntimeError("YouTube download failed - no valid entries found.")

        # Gather downloaded files (yt-dlp adds .mp3)
        actual_paths = []
        for f in UPLOAD_DIR.iterdir():
            if f.is_file() and f.name.startswith(f"{file_id}_") and f.suffix.lower() == download_ext:
                actual_paths.append(f)
                
        if not actual_paths:
            raise RuntimeError("YouTube download failed - no audio files produced.")

        processing_progress[file_id]["status"] = "separating"
        processing_progress[file_id]["progress"] = 35

        output_dir = PROCESSED_DIR / file_id
        output_dir.mkdir(exist_ok=True)
        
        total_files = len(actual_paths)
        for idx, actual_path in enumerate(actual_paths):
            logger.info(f"Separating file {idx + 1}/{total_files}: {actual_path.name}")
            
            # Map 0-100 separation of *this file* into its subset of the remaining 65% progress
            base_pct = 35 + int(65 * (idx / total_files))
            file_pct_span = 65 / total_files
            
            def progress_cb(pct_or_dict):
                if hasattr(pct_or_dict, "get"):
                    val = pct_or_dict.get("progress", pct_or_dict.get("percent", 0))
                else:
                    val = pct_or_dict
                total_pct = base_pct + int(float(val) * file_pct_span / 100)
                processing_progress[file_id]["progress"] = min(total_pct, 100)

            # Extract basic name from actual_path
            stem_name = actual_path.stem.replace(f"{file_id}_", "")
            
            async with separation_lock:
                await gpu_separator.separate_stems(
                    actual_path,
                    output_dir=output_dir,
                    original_filename=stem_name,
                    num_stems=num_stems,
                    output_format=requested_format,
                    progress_callback=progress_cb,
                )
        processing_progress[file_id]["status"] = "packaging"
        processing_progress[file_id]["progress"] = 95
        await asyncio.to_thread(_package_stems_as_zip, output_dir)
        processing_progress[file_id]["status"]   = "done"
        processing_progress[file_id]["progress"] = 100
        logger.info(f"YouTube separation complete for {file_id}")

    except Exception as e:
        logger.error(f"YouTube process failed: {e}", exc_info=True)
        processing_progress[file_id]["status"] = "failed"
        processing_progress[file_id]["error"]  = str(e)
<UPDATED FILE OMITTED FOR BREVITY>
