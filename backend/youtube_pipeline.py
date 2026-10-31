"""
YouTube -> WAV -> Demucs stem-splitting pipeline.

Small, dependency-light helpers used by the YouTube endpoints in ``main.py``:

* ``parse_youtube_url``   - validate/normalise YouTube URLs (strips tracking params,
                            handles youtu.be, shorts, live, embed, music., m., playlists)
* ``sanitize_filename``   - ASCII-only, length-capped, URL/FS-safe names
* ``safe_join`` / ``unique_path`` - path-traversal guard and no-overwrite naming
* ``public_base_url``     - deployment-safe base URL (configured origin, then
                            X-Forwarded-Proto/Host/Prefix, then request.base_url)
* ``download_youtube_audio`` - yt-dlp download (source file is preserved) + ffmpeg
                            conversion to 44.1 kHz stereo 16-bit WAV for Demucs
* ``run_demucs`` / ``collect_stems`` - Demucs CLI separation, stems identified by
                            filename pattern, partial output reported explicitly
* ``run_youtube_split``   - the whole flow, returns a result payload

Playlist behaviour: only ONE track is processed per request.
  - URL has a video id (``watch?v=...&list=...``): the video is processed, the
    playlist is ignored (yt-dlp ``noplaylist``).
  - Playlist-only URL (``/playlist?list=...``): the first playlist entry is processed.
"""
from __future__ import annotations

import importlib.util
import logging
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Mapping, Optional, Tuple
from urllib.parse import parse_qs, quote, urlparse

logger = logging.getLogger(__name__)

ProgressCB = Optional[Callable[[str, int], None]]


class PipelineError(RuntimeError):
    """Error whose message is safe and meaningful to show to end users."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class YouTubeURLError(PipelineError):
    def __init__(self, message: str = "Not a valid YouTube video or playlist URL."):
        super().__init__(message, status_code=400)


# ── URL parsing ──────────────────────────────────────────────────────────────
_YT_HOSTS = {
    "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com",
    "youtube-nocookie.com", "www.youtube-nocookie.com",
}
_YT_SHORT_HOSTS = {"youtu.be", "www.youtu.be"}
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
_PLAYLIST_ID_RE = re.compile(r"^[A-Za-z0-9_-]{2,64}$")
_PATH_ID_PREFIXES = ("shorts", "live", "embed", "v", "e")


@dataclass(frozen=True)
class ParsedYouTubeURL:
    video_id: Optional[str]
    playlist_id: Optional[str]

    @property
    def is_playlist_only(self) -> bool:
        return self.video_id is None and self.playlist_id is not None

    @property
    def canonical_url(self) -> str:
        if self.video_id:
            return f"https://www.youtube.com/watch?v={self.video_id}"
        return f"https://www.youtube.com/playlist?list={self.playlist_id}"


def parse_youtube_url(raw: str) -> ParsedYouTubeURL:
    """Validate a YouTube URL and reduce it to a video id and/or playlist id.

    Extra query parameters (t=, si=, feature=, index=, pp=, ...) are dropped so the
    downloader always receives a clean canonical URL.
    """
    url = (raw or "").strip()
    if not url or len(url) > 2048 or any(c.isspace() for c in url):
        raise YouTubeURLError()
    if "://" not in url:
        url = "https://" + url
    try:
        parsed = urlparse(url)
    except ValueError:
        raise YouTubeURLError()
    if parsed.scheme not in ("http", "https"):
        raise YouTubeURLError()
    host = (parsed.hostname or "").lower().rstrip(".")
    query = parse_qs(parsed.query)
    parts = [p for p in parsed.path.split("/") if p]

    video_id: Optional[str] = None
    if host in _YT_SHORT_HOSTS:
        video_id = parts[0] if parts else None
    elif host in _YT_HOSTS:
        if parts[:1] == ["watch"]:
            video_id = (query.get("v") or [None])[0]
        elif len(parts) >= 2 and parts[0] in _PATH_ID_PREFIXES:
            video_id = parts[1]
        elif parts[:1] == ["playlist"] or not parts:
            video_id = None
        else:
            raise YouTubeURLError()
    else:
        raise YouTubeURLError("Only YouTube URLs (youtube.com / youtu.be) are supported.")

    if video_id is not None and not _VIDEO_ID_RE.match(video_id):
        raise YouTubeURLError("The YouTube video id in this URL is not valid.")

    playlist_id = (query.get("list") or [None])[0]
    if playlist_id is not None and not _PLAYLIST_ID_RE.match(playlist_id):
        playlist_id = None

    if not video_id and not playlist_id:
        raise YouTubeURLError()
    return ParsedYouTubeURL(video_id=video_id, playlist_id=playlist_id)


# ── Filenames & paths ────────────────────────────────────────────────────────
_WINDOWS_RESERVED = {"con", "prn", "aux", "nul", *(f"com{i}" for i in range(1, 10)), *(f"lpt{i}" for i in range(1, 10))}


def sanitize_filename(name: str, max_len: int = 60, fallback: str = "track") -> str:
    """Return an ASCII-only name containing only ``[A-Za-z0-9_-]`` (dots removed).

    Emojis/punctuation are dropped, accents are transliterated, whitespace becomes
    ``_``, and the result is capped at ``max_len`` characters. Never returns an
    empty string, ``.``/``..`` or a Windows reserved device name.
    """
    text = unicodedata.normalize("NFKD", str(name or "")).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^A-Za-z0-9_\- ]+", " ", text)
    text = re.sub(r"[\s_]+", "_", text.strip())
    text = re.sub(r"-{2,}", "-", text).strip("_-")
    text = text[:max_len].rstrip("_-")
    if not text or text.lower() in _WINDOWS_RESERVED:
        text = fallback
    return text


def safe_join(base: Path, *parts: str) -> Path:
    """Join ``parts`` under ``base`` and refuse anything that resolves outside it."""
    base_resolved = Path(base).resolve()
    candidate = base_resolved.joinpath(*parts).resolve()
    if candidate != base_resolved and not candidate.is_relative_to(base_resolved):
        raise PipelineError("Invalid file path.", status_code=400)
    return candidate


def unique_path(directory: Path, filename: str) -> Path:
    """Return ``directory/filename``, or ``name_2.ext``, ``name_3.ext``... if taken."""
    target = safe_join(directory, filename)
    if not target.exists():
        return target
    stem, suffix = target.stem, target.suffix
    for i in range(2, 1000):
        alt = safe_join(directory, f"{stem}_{i}{suffix}")
        if not alt.exists():
            return alt
    raise PipelineError("Could not find a free output filename.")


# ── Public base URL ──────────────────────────────────────────────────────────
_HOST_RE = re.compile(r"^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?::\d{1,5})?$|^\[[0-9A-Fa-f:.]+\](?::\d{1,5})?$")
_PREFIX_RE = re.compile(r"^(?:/[A-Za-z0-9._~-]+)*/?$")
BASE_URL_ENV_VARS = ("DEEPSPLIT_PUBLIC_BASE_URL", "API_BASE_URL", "BACKEND_BASE_URL", "VITE_API_BASE_URL")


def _first_header(headers: Mapping[str, str], name: str) -> str:
    value = headers.get(name) or headers.get(name.lower()) or ""
    return value.split(",")[0].strip()


def configured_base_url(env: Optional[Mapping[str, str]] = None) -> Optional[str]:
    env = os.environ if env is None else env
    for var in BASE_URL_ENV_VARS:
        val = (env.get(var) or "").strip()
        if not val:
            continue
        p = urlparse(val)
        if p.scheme in ("http", "https") and p.netloc:
            return val.rstrip("/")
        logger.warning("Ignoring %s=%r (must be an absolute http(s) URL)", var, val)
    return None


def public_base_url(
    headers: Mapping[str, str],
    request_base_url: str,
    env: Optional[Mapping[str, str]] = None,
) -> str:
    """Origin (plus optional path prefix) used to build file URLs for clients.

    Priority:
      1. A configured origin (DEEPSPLIT_PUBLIC_BASE_URL / API_BASE_URL / BACKEND_BASE_URL /
         VITE_API_BASE_URL) - recommended for production behind a custom domain.
      2. X-Forwarded-Proto / X-Forwarded-Host / X-Forwarded-Prefix from a reverse proxy
         (disable with DEEPSPLIT_TRUST_FORWARDED_HEADERS=0). Values are validated.
      3. ``request.base_url`` (whatever Host the client used - works for local dev).
    """
    env = os.environ if env is None else env
    configured = configured_base_url(env)
    if configured:
        return configured

    base = urlparse(str(request_base_url))
    scheme, netloc, path = base.scheme or "http", base.netloc, base.path

    trust = (env.get("DEEPSPLIT_TRUST_FORWARDED_HEADERS") or "1").strip().lower() not in {"0", "false", "no", "off"}
    if trust:
        proto = _first_header(headers, "X-Forwarded-Proto").lower()
        if proto in ("http", "https"):
            scheme = proto
        fwd_host = _first_header(headers, "X-Forwarded-Host")
        if fwd_host and _HOST_RE.match(fwd_host):
            netloc = fwd_host
        prefix = _first_header(headers, "X-Forwarded-Prefix")
        if prefix and _PREFIX_RE.match(prefix) and not any(seg in (".", "..") for seg in prefix.split("/")):
            path = prefix.rstrip("/") + "/" + path.lstrip("/")

    return f"{scheme}://{netloc}{path}".rstrip("/")


def build_file_url(base_url: str, route: str, file_id: str, filename: str) -> str:
    return f"{base_url.rstrip('/')}/{route.strip('/')}/{quote(file_id, safe='')}/{quote(filename, safe='')}"


# ── Tooling detection ────────────────────────────────────────────────────────
def find_ffmpeg() -> Optional[str]:
    explicit = os.getenv("FFMPEG_PATH", "").strip()
    if explicit and Path(explicit).exists():
        return explicit
    return shutil.which("ffmpeg")


def yt_dlp_available() -> bool:
    return importlib.util.find_spec("yt_dlp") is not None


def demucs_available() -> bool:
    return importlib.util.find_spec("demucs") is not None


def cuda_available() -> bool:
    try:
        import torch  # type: ignore
        return bool(torch.cuda.is_available())
    except Exception:
        return False


def check_youtube_split_dependencies() -> None:
    """Raise a clear 503 PipelineError if a required tool is missing."""
    if not find_ffmpeg():
        raise PipelineError("FFmpeg is not available on the server. Install ffmpeg or set FFMPEG_PATH.", 503)
    if not yt_dlp_available():
        raise PipelineError("YouTube downloader (yt-dlp) is not installed on the server.", 503)
    if not demucs_available():
        raise PipelineError("Stem separation engine (Demucs) is not installed on the server. Run: pip install demucs", 503)


# ── Download ─────────────────────────────────────────────────────────────────
def _yt_error_message(text: str) -> str:
    msg = (text or "").lower()
    if "sign in to confirm" in msg and "bot" in msg:
        return "YouTube blocked this server with a bot check. Configure cookies (DEEPSPLIT_YTDLP_COOKIES) or try again later."
    if "private video" in msg:
        return "This YouTube video is private and cannot be processed."
    if "confirm your age" in msg or "age-restricted" in msg or "sign in" in msg:
        return "This YouTube video requires sign-in or age verification."
    if "video unavailable" in msg or "is not available" in msg or "has been removed" in msg:
        return "This YouTube video is unavailable."
    if "not available in your country" in msg or "geo" in msg or "copyright" in msg:
        return "This YouTube video is region- or copyright-restricted."
    if "name resolution" in msg or "timed out" in msg or "connection" in msg or "network" in msg:
        return "Network error while contacting YouTube."
    return "YouTube download failed."


def _ydl_base_opts() -> Dict:
    opts: Dict = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "socket_timeout": 30,
        "retries": 3,
        "restrictfilenames": True,
        "windowsfilenames": True,
        "overwrites": False,
    }
    ffmpeg = find_ffmpeg()
    if ffmpeg:
        opts["ffmpeg_location"] = ffmpeg
    cookies = os.getenv("DEEPSPLIT_YTDLP_COOKIES", "").strip()
    if cookies and Path(cookies).is_file():
        opts["cookiefile"] = cookies
    return opts


def resolve_target_video(parsed: ParsedYouTubeURL) -> str:
    """Return the single video URL to process (first entry for playlist-only URLs)."""
    if not parsed.is_playlist_only:
        return parsed.canonical_url
    import yt_dlp  # type: ignore

    opts = {**_ydl_base_opts(), "extract_flat": "in_playlist", "playlist_items": "1"}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(parsed.canonical_url, download=False)
    except Exception as exc:
        raise PipelineError(_yt_error_message(str(exc)), 502) from exc
    entries = [e for e in (info or {}).get("entries") or [] if e]
    vid = entries[0].get("id") if entries else None
    if not vid or not _VIDEO_ID_RE.match(str(vid)):
        raise PipelineError("This playlist is empty or unavailable.", 400)
    return f"https://www.youtube.com/watch?v={vid}"


def convert_to_wav(src: Path, dst: Path, sample_rate: int = 44100) -> None:
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise PipelineError("FFmpeg is not available on the server.", 503)
    cmd = [ffmpeg, "-n", "-hide_banner", "-nostdin", "-loglevel", "error", "-i", str(src),
           "-vn", "-ac", "2", "-ar", str(sample_rate), "-c:a", "pcm_s16le", str(dst)]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60 * 20)
    if proc.returncode != 0 or not dst.exists() or dst.stat().st_size < 1024:
        logger.error("ffmpeg conversion failed: %s", proc.stderr[-2000:])
        raise PipelineError("Could not convert the downloaded audio to WAV.")


def download_youtube_audio(
    url: str,
    dest_dir: Path,
    progress: ProgressCB = None,
    max_duration_s: Optional[int] = None,
) -> Tuple[Path, Path, Dict]:
    """Download best audio for ONE video into ``dest_dir`` and convert to WAV.

    Returns (source_file, wav_file, info). The original download is kept
    (``source.<ext>``); the Demucs input is ``input.wav``. Nothing is overwritten.
    """
    import yt_dlp  # type: ignore

    dest_dir.mkdir(parents=True, exist_ok=True)

    def hook(d):
        if not progress:
            return
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            if total:
                progress("downloading", 5 + int(25 * min(1.0, d.get("downloaded_bytes", 0) / total)))
        elif d.get("status") == "finished":
            progress("downloading", 30)

    opts = {
        **_ydl_base_opts(),
        "format": "bestaudio/best",
        "noplaylist": True,
        # Title never touches the filesystem: fixed name inside a per-job UUID dir.
        "outtmpl": str(dest_dir / "source.%(ext)s"),
        "progress_hooks": [hook],
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise PipelineError("YouTube returned no information for this URL.", 502)
            if info.get("_type") == "playlist" or info.get("entries"):
                raise PipelineError("Expected a single video but got a playlist.", 400)
            if info.get("is_live"):
                raise PipelineError("Live streams cannot be split. Try again after the stream ends.", 400)
            duration = info.get("duration") or 0
            if max_duration_s and duration and duration > max_duration_s:
                raise PipelineError(
                    f"Video is too long ({int(duration // 60)} min). Maximum is {max_duration_s // 60} min.", 400
                )
            info = ydl.process_ie_result(info, download=True)
    except PipelineError:
        raise
    except Exception as exc:
        logger.error("yt-dlp failed: %s", exc)
        raise PipelineError(_yt_error_message(str(exc)), 502) from exc

    sources = sorted(p for p in dest_dir.glob("source.*") if p.is_file() and not p.name.endswith((".part", ".ytdl")))
    if not sources:
        raise PipelineError("YouTube download produced no audio file.", 502)
    source = sources[0]

    if progress:
        progress("downloading", 32)
    wav = unique_path(dest_dir, "input.wav")
    convert_to_wav(source, wav)
    return source, wav, info


# ── Demucs ───────────────────────────────────────────────────────────────────
EXPECTED_STEMS: Dict[int, List[str]] = {
    2: ["vocals", "instrumental"],
    4: ["vocals", "drums", "bass", "other"],
    5: ["vocals", "drums", "bass", "guitar", "other"],
    6: ["vocals", "drums", "bass", "guitar", "piano", "other"],
}
ALLOWED_DEMUCS_MODELS = {"htdemucs", "htdemucs_ft", "htdemucs_6s", "hdemucs_mmi", "mdx", "mdx_extra", "mdx_q", "mdx_extra_q"}
SIX_STEM_MODELS = {"htdemucs_6s"}
_STEM_ALIASES = {"no_vocals": "instrumental", "accompaniment": "instrumental", "drum": "drums", "vocal": "vocals"}
_STEM_RE = re.compile(r"(?:^|[_\-. ])(no_vocals|instrumental|accompaniment|vocals?|drums?|bass|guitar|piano|other)$", re.I)


def normalize_stem_count(num_stems: Optional[int]) -> int:
    try:
        n = int(num_stems or 4)
    except (TypeError, ValueError):
        n = 4
    if n in EXPECTED_STEMS:
        return n
    return 6 if n > 6 else 4


def identify_stem(filename: str) -> Optional[str]:
    """Map a file name such as ``Song_vocals.wav`` / ``no_vocals.mp3`` to a stem key."""
    m = _STEM_RE.search(Path(filename).stem)
    if not m:
        return None
    key = m.group(1).lower()
    return _STEM_ALIASES.get(key, key)


@dataclass
class DemucsPlan:
    model: str
    device: str
    two_stems: bool = False
    extra_args: List[str] = field(default_factory=list)
    fallback_model: Optional[str] = None


def _diffq_available() -> bool:
    return importlib.util.find_spec("diffq") is not None


def choose_demucs_plan(num_stems: int, env: Optional[Mapping[str, str]] = None, has_cuda: Optional[bool] = None) -> DemucsPlan:
    """Pick model/device. GPU -> htdemucs (default settings). CPU -> htdemucs with
    conservative settings (``--segment 7 -j 1``), or mdx_q when DEEPSPLIT_CPU_CONSTRAINED=1.
    6/5-stem modes need htdemucs_6s. DEEPSPLIT_DEMUCS_MODEL overrides (4/2-stem only).
    """
    env = os.environ if env is None else env
    gpu = cuda_available() if has_cuda is None else has_cuda
    device = "cuda" if gpu else "cpu"
    cpu_constrained = (env.get("DEEPSPLIT_CPU_CONSTRAINED") or "").strip().lower() in {"1", "true", "yes", "on"}
    override = (env.get("DEEPSPLIT_DEMUCS_MODEL") or "").strip()
    if override and override not in ALLOWED_DEMUCS_MODELS:
        logger.warning("Ignoring unknown DEEPSPLIT_DEMUCS_MODEL=%r", override)
        override = ""

    extra = [] if gpu else ["--segment", "7", "-j", "1"]
    q_ok = _diffq_available()

    if num_stems in (5, 6):
        return DemucsPlan(model="htdemucs_6s", device=device, extra_args=extra)

    if override and override not in SIX_STEM_MODELS:
        model = override
    elif cpu_constrained and not gpu and q_ok:
        model = "mdx_q"
    else:
        model = "htdemucs"
    if model.startswith("mdx"):
        extra = [a for a in extra if a not in ("--segment", "7")]  # segment flag is for (h)tdemucs
    fallback = "mdx_q" if (model != "mdx_q" and q_ok) else None
    return DemucsPlan(model=model, device=device, two_stems=(num_stems == 2), extra_args=extra, fallback_model=fallback)


_PCT_RE = re.compile(rb"(\d{1,3})%\|")


def run_demucs(wav: Path, out_dir: Path, plan: DemucsPlan, progress: ProgressCB = None, timeout_s: Optional[int] = None) -> Path:
    """Run ``python -m demucs`` and return the directory containing ``<stem>.wav`` files."""
    if not demucs_available():
        raise PipelineError("Stem separation engine (Demucs) is not installed on the server.", 503)
    timeout_s = timeout_s or int(os.getenv("DEEPSPLIT_DEMUCS_TIMEOUT", "3600"))
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, "-m", "demucs", "-n", plan.model, "-d", plan.device, "-o", str(out_dir),
           "--filename", "{stem}.{ext}", *plan.extra_args]
    if plan.two_stems:
        cmd += ["--two-stems", "vocals"]
    cmd.append(str(wav))
    logger.info("exec: %s", " ".join(cmd))

    import threading

    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    timed_out = threading.Event()

    def _kill():
        timed_out.set()
        proc.kill()

    watchdog = threading.Timer(timeout_s, _kill)
    watchdog.daemon = True
    watchdog.start()
    tail = b""
    assert proc.stderr is not None
    try:
        while True:
            chunk = proc.stderr.read1(4096)
            if not chunk:
                break
            tail = (tail + chunk)[-8000:]
            pcts = _PCT_RE.findall(chunk)
            if pcts and progress:
                progress("separating", 35 + int(min(100, int(pcts[-1])) * 0.55))
    finally:
        watchdog.cancel()
    rc = proc.wait()
    stderr_text = tail.decode("utf-8", "replace")
    if timed_out.is_set():
        raise PipelineError(f"Stem separation timed out after {timeout_s}s.")
    if rc != 0:
        logger.error("Demucs failed (rc=%s): %s", rc, stderr_text[-3000:])
        if rc < 0 or "out of memory" in stderr_text.lower() or "killed" in stderr_text.lower():
            raise PipelineError("Stem separation ran out of memory on the server. Try a shorter track.")
        raise PipelineError("Stem separation (Demucs) failed. See server logs for details.")
    result_dir = out_dir / plan.model
    if not result_dir.is_dir():
        raise PipelineError("Demucs finished but produced no output folder.")
    return result_dir


def collect_stems(directory: Path) -> Dict[str, Path]:
    """Find stem files by filename pattern (first match per stem wins)."""
    found: Dict[str, Path] = {}
    if not directory.is_dir():
        return found
    for p in sorted(directory.iterdir()):
        if p.is_file() and p.suffix.lower() in {".wav", ".mp3", ".flac"} and p.stat().st_size > 0:
            key = identify_stem(p.name)
            if key and key not in found:
                found[key] = p
    return found


def _mix_into(target: Path, extra: Path) -> None:
    """target += extra (16-bit PCM WAV, same format), clipped. Used for 5-stem mode."""
    import wave
    import numpy as np  # demucs dependency

    with wave.open(str(target), "rb") as a, wave.open(str(extra), "rb") as b:
        params = a.getparams()
        if params.sampwidth != 2 or b.getsampwidth() != 2 or params.nchannels != b.getnchannels():
            raise PipelineError("Unexpected stem format while merging stems.")
        da = np.frombuffer(a.readframes(a.getnframes()), dtype=np.int16).astype(np.int32)
        db = np.frombuffer(b.readframes(b.getnframes()), dtype=np.int16).astype(np.int32)
    n = min(len(da), len(db))
    mixed = da.copy()
    mixed[:n] += db[:n]
    tmp = target.with_suffix(".mixing.wav")
    with wave.open(str(tmp), "wb") as w:
        w.setparams(params)
        w.writeframes(np.clip(mixed, -32768, 32767).astype(np.int16).tobytes())
    os.replace(tmp, target)


def export_stem(src_wav: Path, dest: Path, fmt: str) -> None:
    if fmt == "wav":
        shutil.copy2(src_wav, dest)
        return
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise PipelineError("FFmpeg is not available on the server.", 503)
    codec = ["-c:a", "libmp3lame", "-b:a", "320k"] if fmt == "mp3" else ["-c:a", "flac"]
    cmd = [ffmpeg, "-n", "-hide_banner", "-nostdin", "-loglevel", "error", "-i", str(src_wav), *codec, str(dest)]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60 * 10)
    if proc.returncode != 0 or not dest.exists():
        logger.error("ffmpeg export failed: %s", proc.stderr[-2000:])
        raise PipelineError(f"Could not export stems as {fmt.upper()}.")


@dataclass
class SplitResult:
    title: str
    safe_title: str
    video_id: Optional[str]
    model: str
    device: str
    format: str
    stems: Dict[str, str]           # stem -> filename in output_dir
    missing: List[str]
    notes: List[str]


def separate_to_output(
    wav: Path,
    work_dir: Path,
    output_dir: Path,
    safe_title: str,
    num_stems: int,
    out_format: str = "wav",
    progress: ProgressCB = None,
    plan: Optional[DemucsPlan] = None,
) -> Tuple[Dict[str, str], List[str], DemucsPlan, List[str]]:
    """Run Demucs on ``wav`` and write ``<safe_title>_<stem>.<fmt>`` into ``output_dir``.

    Returns (stems, missing, plan_used, notes). Raises PipelineError when Demucs fails or
    produces none of the expected stems. Existing files are never overwritten.
    """
    num_stems = normalize_stem_count(num_stems)
    out_format = out_format if out_format in {"wav", "mp3", "flac"} else "wav"
    plan = plan or choose_demucs_plan(num_stems)
    notes: List[str] = []

    try:
        stem_dir = run_demucs(wav, work_dir / "demucs", plan, progress)
    except PipelineError as exc:
        if not plan.fallback_model or exc.status_code == 503:
            raise
        logger.warning("Demucs %s failed (%s); retrying with %s", plan.model, exc, plan.fallback_model)
        notes.append(f"{plan.model} failed; used fallback model {plan.fallback_model}.")
        plan = DemucsPlan(model=plan.fallback_model, device="cpu", two_stems=plan.two_stems, extra_args=["-j", "1"])
        stem_dir = run_demucs(wav, work_dir / "demucs_fallback", plan, progress)

    raw = collect_stems(stem_dir)
    if num_stems == 5 and "piano" in raw and "other" in raw:
        _mix_into(raw["other"], raw.pop("piano"))
        notes.append("5-stem mode: piano was merged into 'other'.")

    expected = EXPECTED_STEMS[num_stems]
    missing = [s for s in expected if s not in raw]
    if not any(s in raw for s in expected):
        raise PipelineError("Stem separation produced no stems.")

    output_dir.mkdir(parents=True, exist_ok=True)
    written: Dict[str, str] = {}
    for stem in expected:
        if stem not in raw:
            continue
        dest = unique_path(output_dir, f"{safe_title}_{stem}.{out_format}")
        export_stem(raw[stem], dest, out_format)
        written[stem] = dest.name
    return written, missing, plan, notes


def run_youtube_split(
    url: str,
    job_id: str,
    upload_dir: Path,
    processed_dir: Path,
    num_stems: int = 4,
    out_format: str = "wav",
    progress: ProgressCB = None,
    max_duration_s: Optional[int] = None,
) -> SplitResult:
    """Full flow for one YouTube URL. Source audio lives in ``upload_dir/yt_<job_id>/``,
    stems in ``processed_dir/<job_id>/``. ``job_id`` must be a UUID string.
    """
    import uuid as _uuid

    job_id = str(_uuid.UUID(str(job_id)))  # raises ValueError on anything else
    check_youtube_split_dependencies()
    parsed = parse_youtube_url(url)

    source_dir = safe_join(upload_dir, f"yt_{job_id}")
    output_dir = safe_join(processed_dir, job_id)
    if output_dir.exists() and any(output_dir.iterdir()):
        raise PipelineError("Output folder for this job already exists; refusing to overwrite.", 409)

    if progress:
        progress("downloading", 3)
    target = resolve_target_video(parsed)
    notes: List[str] = []
    if parsed.playlist_id:
        notes.append("Playlist URL detected: only one track is processed per request "
                     + ("(the linked video)." if parsed.video_id else "(the first playlist entry)."))

    _, wav, info = download_youtube_audio(target, source_dir, progress, max_duration_s=max_duration_s)
    title = (info.get("title") or "YouTube Track").strip()
    safe_title = sanitize_filename(title, fallback=f"youtube_{info.get('id') or job_id[:8]}")

    if progress:
        progress("separating", 35)
    stems, missing, plan, sep_notes = separate_to_output(
        wav, source_dir, output_dir, safe_title, num_stems, out_format, progress
    )
    return SplitResult(
        title=title, safe_title=safe_title, video_id=info.get("id"), model=plan.model, device=plan.device,
        format=out_format, stems=stems, missing=missing, notes=notes + sep_notes,
    )


def build_result_payload(job_id: str, result: SplitResult, base_url: str, zip_name: Optional[str]) -> Dict:
    files = [
        {
            "stem": stem,
            "filename": name,
            "url": build_file_url(base_url, "processed", job_id, name),
            "download_url": build_file_url(base_url, "download", job_id, name),
        }
        for stem, name in result.stems.items()
    ]
    return {
        "file_id": job_id,
        "title": result.title,
        "safe_title": result.safe_title,
        "video_id": result.video_id,
        "model": result.model,
        "device": result.device,
        "format": result.format,
        "stems": {f["stem"]: f["url"] for f in files},
        "files": files,
        "zip": build_file_url(base_url, "download", job_id, zip_name) if zip_name else None,
        "missing_stems": result.missing,
        "notes": result.notes,
    }
