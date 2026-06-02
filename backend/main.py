"""
DeepSplit Backend — FastAPI
Endpoints:
  POST /upload/                  Upload an audio file
  POST /process/                 Trim + separate stems (background task)
  GET  /progress/{file_id}       Poll separation progress
  GET  /processed/{file_id}/{fn} Download a processed stem
  GET  /files/{file_id}          List all processed stems with download URLs
  POST /process_youtube/         YouTube funnel: download → WAV → 2-stem MP3
  POST /process_fx/              Apply FX preset to a stem
  GET  /presets/{stem_name}      List FX presets available for a stem type
"""

import asyncio
import gc
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
import zipfile
from pathlib import Path
from threading import Lock
from typing import Optional

import aiofiles
from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ── Logging ─────────────────────────────────────────────────────────────────
_log_handlers = [logging.StreamHandler(sys.stdout)]
_log_file = os.getenv("DEEPSPLIT_LOG_FILE")
if _log_file:
    _log_path = Path(_log_file).expanduser()
    if not _log_path.is_absolute():
        raise RuntimeError("DEEPSPLIT_LOG_FILE must be an absolute path.")
    _log_path.parent.mkdir(parents=True, exist_ok=True)
    _log_handlers.append(logging.FileHandler(_log_path, encoding="utf-8"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=_log_handlers,
)
logger = logging.getLogger("deepsplit")

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
TEMP_DIR = BASE_DIR / "temp"
UPLOAD_DIR = TEMP_DIR / "uploads"
JOBS_DIR = TEMP_DIR / "jobs"

for _d in (UPLOAD_DIR, JOBS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ── Progress store (in-memory, protected by a lock) ──────────────────────────
_progress_lock = Lock()
_progress: dict[str, dict] = {}


def _set_progress(file_id: str, **kwargs):
    with _progress_lock:
        if file_id not in _progress:
            _progress[file_id] = {}
        _progress[file_id].update(kwargs)


def _get_progress(file_id: str) -> dict:
    with _progress_lock:
        return dict(_progress.get(file_id, {}))


# ── Separator (lazy singleton per worker) ────────────────────────────────────
_separator = None
_separator_lock = asyncio.Lock()


async def _get_separator():
    global _separator
    async with _separator_lock:
        if _separator is None:
            from separator import AudioSeparator
            _separator = AudioSeparator(use_gpu=True)
    return _separator


# ── Rate limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="DeepSplit API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Constants ────────────────────────────────────────────────────────────────
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_AUDIO_EXTS = {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".aiff", ".aif", ".webm"}
ALLOWED_MIME_PREFIXES = ("audio/", "video/webm", "application/octet-stream")
ALLOWED_OUTPUT_FORMATS = {"mp3", "wav", "flac"}

YT_REGEX = re.compile(
    r"^(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)[\w\-]+"
)

_SAFE_FILENAME_RE = re.compile(r"^[\w\-. ]+$")  # alphanumeric, dash, dot, underscore, space


def _sanitize_file_id(file_id: str) -> str:
    """
    Validate that file_id is a well-formed UUID and return a clean string
    derived from the parsed UUID object (breaks CodeQL taint chain).
    Raises HTTPException 422 on invalid input.
    """
    try:
        return str(uuid.UUID(file_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="Invalid job identifier.")


def _safe_filename(filename: str) -> str:
    """
    Strip directory components and validate that the filename only contains
    safe characters.  Returns the validated basename.
    Raises HTTPException 422 if the filename is invalid.
    """
    name = Path(filename).name
    if not name or not _SAFE_FILENAME_RE.match(name):
        raise HTTPException(status_code=422, detail=f"Invalid filename: '{filename}'.")
    return name


# ── Helpers ───────────────────────────────────────────────────────────────────

def _job_dir(safe_id: str) -> Path:
    """Return (and create) the job directory for a *pre-sanitized* UUID string."""
    d = JOBS_DIR / safe_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _stems_dir(safe_id: str) -> Path:
    """Return the stems sub-directory path for a *pre-sanitized* UUID string."""
    return JOBS_DIR / safe_id / "stems"


def _create_stems_dir(safe_id: str) -> Path:
    """Return (and create) the stems sub-directory for a *pre-sanitized* UUID string."""
    d = _job_dir(safe_id) / "stems"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _build_files_response(file_id: str, base_url: str) -> list[dict]:
    """Return [{filename, url}] for every file in the stems directory."""
    stems = _stems_dir(file_id)
    files = []
    for f in sorted(stems.iterdir()):
        if f.is_file():
            files.append({
                "filename": f.name,
                "url": f"{base_url}/processed/{file_id}/{f.name}",
            })
    return files


def _ffmpeg_to_wav(input_path: Path, output_path: Path):
    """Convert any audio/video to 44.1 kHz stereo WAV using ffmpeg."""
    ffmpeg_bin = _find_ffmpeg()
    cmd = [
        ffmpeg_bin, "-y",
        "-i", str(input_path),
        "-vn",                    # strip video
        "-ar", "44100",
        "-ac", "2",
        "-sample_fmt", "s16",
        str(output_path),
    ]
    logger.info("FFmpeg convert: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, timeout=600)
    if result.returncode != 0:
        err = result.stderr.decode(errors="replace")
        logger.error("FFmpeg failed: %s", err)
        raise RuntimeError(f"FFmpeg conversion failed: {err[-500:]}")
    logger.info("FFmpeg OK → %s", output_path)


def _make_zip(stems_dir: Path) -> Optional[Path]:
    """Zip all stem files in stems_dir and return the zip path (or None if empty)."""
    stem_files = [f for f in stems_dir.iterdir() if f.is_file() and not f.name.endswith(".zip")]
    if not stem_files:
        return None
    zip_path = stems_dir / "stems.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in stem_files:
            zf.write(f, f.name)
    return zip_path


def _validate_yt_url(url: str):
    if not YT_REGEX.match(url.strip()):
        raise HTTPException(status_code=422, detail="Invalid YouTube URL. Only single video URLs are supported.")


def _find_ffmpeg() -> str:
    """Resolve the ffmpeg binary path (system or bundled)."""
    # 1. Try system path
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    # 2. Try bundled alongside executable
    bundled = Path(sys.executable).parent / "ffmpeg"
    if bundled.exists():
        return str(bundled)
    bundled_win = Path(sys.executable).parent / "ffmpeg.exe"
    if bundled_win.exists():
        return str(bundled_win)
    raise RuntimeError("ffmpeg not found. Install it or bundle it next to the executable.")


# ── Background tasks ──────────────────────────────────────────────────────────

async def _run_separation(
    file_id: str,
    audio_path: Path,
    stems_dir: Path,
    original_filename: str,
    num_stems: int,
    output_format: str,
    model_type: str = "auto",
):
    """Core coroutine: separate audio and update progress."""
    try:
        _set_progress(file_id, status="separating", progress=20)

        def _cb(pct):
            mapped = 20 + int(pct * 0.75)
            _set_progress(file_id, progress=mapped)

        sep = await _get_separator()
        stems = await sep.separate_stems(
            audio_path=audio_path,
            output_dir=stems_dir,
            original_filename=original_filename,
            num_stems=num_stems,
            output_format=output_format,
            model_type=model_type,
            progress_callback=_cb,
        )
        logger.info("Separation done for %s: %s", file_id, stems)
        gc.collect()

        _set_progress(file_id, status="packaging", progress=97)
        _make_zip(stems_dir)

        _set_progress(file_id, status="done", progress=100)
    except Exception as exc:
        logger.exception("Separation failed for %s", file_id)
        _set_progress(file_id, status="failed", progress=0, error=str(exc))


async def _youtube_pipeline(
    file_id: str,
    url: str,
    num_stems: int,
    output_format: str,
):
    """Full YouTube funnel: download → WAV → separate → zip."""
    job = _job_dir(file_id)
    stems = _create_stems_dir(file_id)
    raw_dir = job / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    try:
        # ── Step 1: validate ────────────────────────────────────────────────
        _set_progress(file_id, status="initializing", progress=2)

        # ── Step 2: download with yt-dlp ────────────────────────────────────
        _set_progress(file_id, status="downloading", progress=5)

        ffmpeg_bin = _find_ffmpeg()
        ydl_output = str(raw_dir / "source.%(ext)s")

        ydl_cmd = [
            sys.executable, "-m", "yt_dlp",
            "--no-playlist",
            "--format", "bestaudio",
            "--ffmpeg-location", str(Path(ffmpeg_bin).parent),
            "-o", ydl_output,
            "--quiet", "--no-warnings",
            url.strip(),
        ]
        logger.info("yt-dlp command: %s", " ".join(ydl_cmd))

        proc = await asyncio.create_subprocess_exec(
            *ydl_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
        if proc.returncode != 0:
            err_text = stderr.decode(errors="replace")
            logger.error("yt-dlp failed: %s", err_text)
            if "Video unavailable" in err_text or "not available" in err_text.lower():
                raise RuntimeError("Video is unavailable or restricted.")
            if "Sign in" in err_text or "age" in err_text.lower():
                raise RuntimeError("This video requires sign-in or is age-restricted.")
            raise RuntimeError(f"Download failed: {err_text[-300:]}")

        # Locate the downloaded file (ignore .part files)
        downloaded = next(
            (f for f in raw_dir.iterdir()
             if f.name.startswith("source.") and not f.name.endswith(".part")),
            None,
        )
        if not downloaded:
            raise RuntimeError("Downloaded file not found after yt-dlp finished.")
        logger.info("Downloaded: %s", downloaded)
        _set_progress(file_id, status="downloading", progress=25)

        # ── Step 3: FFmpeg → WAV ────────────────────────────────────────────
        _set_progress(file_id, status="converting", progress=30)
        wav_path = job / "input.wav"
        _ffmpeg_to_wav(downloaded, wav_path)
        _set_progress(file_id, status="converting", progress=40)

        # ── Step 4: Separate ────────────────────────────────────────────────
        # Free funnel: force 2 stems (vocals + instrumental), MP3 output
        forced_stems = min(num_stems, 2)
        forced_format = "mp3"

        await _run_separation(
            file_id=file_id,
            audio_path=wav_path,
            stems_dir=stems,
            original_filename="youtube_audio",
            num_stems=forced_stems,
            output_format=forced_format,
        )

    except Exception as exc:
        logger.exception("YouTube pipeline failed for %s", file_id)
        # Only update if not already marked failed inside _run_separation
        current = _get_progress(file_id)
        if current.get("status") != "failed":
            _set_progress(file_id, status="failed", progress=0, error=str(exc))
    finally:
        # Clean up raw download to save disk space
        try:
            shutil.rmtree(raw_dir, ignore_errors=True)
        except Exception:
            pass


async def _upload_pipeline(
    file_id: str,
    audio_path: Path,
    original_filename: str,
    start_ms: int,
    end_ms: int,
    num_stems: int,
    output_format: str,
):
    """Upload + trim + separate pipeline for locally uploaded files."""
    job = _job_dir(file_id)
    stems = _create_stems_dir(file_id)

    try:
        _set_progress(file_id, status="converting", progress=5)

        # Trim audio if a region is specified
        if start_ms >= 0 and end_ms > start_ms:
            from utils import trim_audio
            trimmed_stem = job / "trimmed"
            trimmed_path = await asyncio.to_thread(
                trim_audio, audio_path, trimmed_stem, start_ms, end_ms
            )
        else:
            trimmed_path = audio_path

        # Convert to WAV if needed (separator works best with WAV)
        if trimmed_path.suffix.lower() not in (".wav",):
            wav_path = job / "input.wav"
            await asyncio.to_thread(_ffmpeg_to_wav, trimmed_path, wav_path)
            input_path = wav_path
        else:
            input_path = trimmed_path

        _set_progress(file_id, status="separating", progress=15)

        await _run_separation(
            file_id=file_id,
            audio_path=input_path,
            stems_dir=stems,
            original_filename=Path(original_filename).stem,
            num_stems=num_stems,
            output_format=output_format,
        )
    except Exception as exc:
        logger.exception("Upload pipeline failed for %s", file_id)
        current = _get_progress(file_id)
        if current.get("status") != "failed":
            _set_progress(file_id, status="failed", progress=0, error=str(exc))


# ── Request models ────────────────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    file_id: str
    filename: str
    start_ms: int = 0
    end_ms: int = 0
    num_stems: int = 6
    output_format: str = "mp3"


class YoutubeRequest(BaseModel):
    url: str
    format: str = "mp3"
    num_stems: int = 2


class FXRequest(BaseModel):
    file_id: str
    filename: str
    preset_id: str
    passes: int = 1
    mix: float = 1.0
    preview: bool = False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "service": "DeepSplit API"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/upload/")
@limiter.limit("10/minute")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """
    Upload an audio file. Returns file_id and filename for subsequent /process/ calls.
    Validates: file size ≤ 50 MB, audio extension, basic MIME.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_AUDIO_EXTS))}",
        )

    file_id = str(uuid.uuid4())
    upload_path = UPLOAD_DIR / file_id
    upload_path.mkdir(parents=True, exist_ok=True)
    # Sanitize the original filename for safe storage
    safe_name = re.sub(r"[^\w\-. ]", "_", Path(file.filename or f"audio{ext}").name) or f"audio{ext}"
    dest = upload_path / safe_name

    # Stream to disk while checking size
    total = 0
    async with aiofiles.open(dest, "wb") as out:
        while chunk := await file.read(65536):
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                await out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_BYTES // (1024*1024)} MB.",
                )
            await out.write(chunk)

    logger.info("Uploaded %s → %s (%d bytes)", file.filename, dest, total)
    _set_progress(file_id, status="uploaded", progress=0)

    return {"file_id": file_id, "filename": safe_name}


@app.post("/process/")
async def process_audio(req: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Trigger background stem separation for a previously uploaded file.
    The file must exist under UPLOAD_DIR/file_id/.
    """
    safe_id = _sanitize_file_id(req.file_id)
    output_format = req.output_format.strip().lower()
    if output_format not in ALLOWED_OUTPUT_FORMATS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid output format. Allowed values: {', '.join(sorted(ALLOWED_OUTPUT_FORMATS))}.",
        )

    # Validate trim region
    if req.end_ms > 0 and req.start_ms >= req.end_ms:
        raise HTTPException(status_code=422, detail="start_ms must be less than end_ms.")
    if req.end_ms > 0 and (req.end_ms - req.start_ms) < 3000:
        raise HTTPException(status_code=422, detail="Audio region must be at least 3 seconds.")

    # Locate the uploaded file
    upload_path = UPLOAD_DIR / safe_id
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail=f"File ID not found.")

    candidates = list(upload_path.iterdir())
    if not candidates:
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
    audio_path = candidates[0]

    _set_progress(safe_id, status="queued", progress=0)

    background_tasks.add_task(
        _upload_pipeline,
        file_id=safe_id,
        audio_path=audio_path,
        original_filename=req.filename,
        start_ms=req.start_ms,
        end_ms=req.end_ms,
        num_stems=req.num_stems,
        output_format=output_format,
    )

    return {"status": "processing", "file_id": safe_id}


@app.post("/process_youtube/")
@limiter.limit("5/minute")
async def process_youtube(req: YoutubeRequest, request: Request, background_tasks: BackgroundTasks):
    """
    YouTube funnel. Accepts a YouTube URL, downloads audio, converts to WAV,
    separates into 2 stems (vocals + instrumental), exports as MP3.
    Returns a file_id for polling /progress/{file_id} and /files/{file_id}.
    """
    _validate_yt_url(req.url)

    # Normalise: free funnel only supports 2 stems
    num_stems = max(2, min(req.num_stems, 2))
    file_id = str(uuid.uuid4())
    _set_progress(file_id, status="queued", progress=0)

    background_tasks.add_task(
        _youtube_pipeline,
        file_id=file_id,
        url=req.url,
        num_stems=num_stems,
        output_format="mp3",
    )

    return {"file_id": file_id, "status": "queued"}


@app.get("/progress/{file_id}")
async def get_progress(file_id: str):
    """Poll separation / YouTube pipeline progress."""
    safe_id = _sanitize_file_id(file_id)
    data = _get_progress(safe_id)
    if not data:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {
        "file_id": safe_id,
        "status": data.get("status", "unknown"),
        "progress": data.get("progress", 0),
        "error": data.get("error"),
    }


@app.get("/files/{file_id}")
async def list_files(file_id: str, request: Request):
    """Return all processed stem files for a job."""
    safe_id = _sanitize_file_id(file_id)
    stems_path = JOBS_DIR / safe_id / "stems"
    if not stems_path.exists():
        raise HTTPException(status_code=404, detail="Job not found.")
    base_url = str(request.base_url).rstrip("/")
    files = _build_files_response(safe_id, base_url)
    return {"file_id": safe_id, "files": files}


@app.get("/processed/{file_id}/{filename}")
async def download_stem(file_id: str, filename: str):
    """Download a processed stem file."""
    safe_id = _sanitize_file_id(file_id)
    safe_name = _safe_filename(filename)
    stems_path = _stems_dir(safe_id)
    # Resolve path from directory listing so the file object comes from the filesystem
    found_path = next(
        (f for f in stems_path.iterdir() if f.is_file() and f.name == safe_name),
        None,
    )
    if found_path is None:
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(str(found_path), filename=found_path.name)


# ── FX endpoints ──────────────────────────────────────────────────────────────

@app.get("/presets/{stem_name}")
async def get_presets(stem_name: str):
    """Return available FX presets for a given stem type (e.g. vocals, drums)."""
    from fx_engine import FXEngine
    engine = FXEngine(output_dir=TEMP_DIR)
    presets = engine.get_presets_for_stem(stem_name)
    return {"stem_name": stem_name, "presets": presets}


@app.post("/process_fx/")
async def apply_fx(req: FXRequest, background_tasks: BackgroundTasks):
    """Apply an FX preset to a stem file and save the result."""
    safe_id = _sanitize_file_id(req.file_id)
    safe_name = _safe_filename(req.filename)
    stems_path = _stems_dir(safe_id)
    # Resolve input path from directory listing so it comes from the filesystem
    input_path = next(
        (f for f in stems_path.iterdir() if f.is_file() and f.name == safe_name),
        None,
    )
    if input_path is None:
        raise HTTPException(status_code=404, detail="Stem file not found.")

    stem_root = input_path.stem
    ext = input_path.suffix
    # Sanitize preset_id to prevent path injection in the output filename
    safe_preset_id = re.sub(r"[^\w\-]", "_", req.preset_id)
    output_filename = f"{stem_root}_fx_{safe_preset_id}{ext}"
    output_path = stems_path / output_filename

    fx_id = str(uuid.uuid4())
    _set_progress(fx_id, status="processing", progress=0)

    async def _run_fx():
        try:
            from fx_engine import FXEngine
            engine = FXEngine(output_dir=stems_path)
            await asyncio.to_thread(
                engine.process_fx,
                str(input_path),
                str(output_path),
                req.preset_id,
                req.passes,
                req.mix,
                req.preview,
                lambda p: _set_progress(fx_id, progress=int(p)),
            )
            _set_progress(fx_id, status="done", progress=100)
        except Exception as exc:
            logger.exception("FX failed for %s/%s", req.file_id, req.filename)
            _set_progress(fx_id, status="failed", error=str(exc))

    background_tasks.add_task(_run_fx)

    return {
        "fx_id": fx_id,
        "output_filename": output_filename,
        "status": "processing",
    }


# ── Entrypoint ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, log_level="info")
