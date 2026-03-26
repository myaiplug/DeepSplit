import os
import subprocess
from pathlib import Path

def get_file_path(directory: Path, filename: str) -> Path:
    return directory / filename

def ensure_dir(directory: Path):
    directory.mkdir(parents=True, exist_ok=True)

def trim_audio(input_path: Path, output_path_stem: Path, start_ms: int, end_ms: int) -> Path:
    """
    Trims the audio from start_ms to end_ms.
    Uses ffmpeg with stream copy for lossless formats, and re-encodes to WAV otherwise.
    Returns the actual Path written (since extension might change).
    """
    start_sec = start_ms / 1000.0
    duration_sec = (end_ms - start_ms) / 1000.0

    ext = input_path.suffix.lower()
    lossless_exts = {".wav", ".flac", ".aiff", ".aif"}

    if ext in lossless_exts:
        # Avoid re-encoding for lossless formats
        actual_output = output_path_stem.with_suffix(ext)
        cmd = [
            "ffmpeg", "-y", "-i", str(input_path),
            "-ss", str(start_sec), "-t", str(duration_sec),
            "-c", "copy", str(actual_output)
        ]
    else:
        # Re-encode to highly compatible WAV for the separator
        actual_output = output_path_stem.with_suffix(".wav")
        cmd = [
            "ffmpeg", "-y", "-i", str(input_path),
            "-ss", str(start_sec), "-t", str(duration_sec),
            str(actual_output)
        ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
        raise Exception(f"FFmpeg trim failed: {e.stderr.decode()}")

    return actual_output
