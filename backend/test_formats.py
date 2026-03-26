"""
Integration test for the DeepSplit API pipeline.
Tests upload â†’ process â†’ poll for stems across WAV, MP3, FLAC formats.
"""

import requests
import time
import os
import wave
import struct
import math
import subprocess
from pathlib import Path

BASE_URL = "http://localhost:8000"

def generate_wav(filename, duration=3.0, freq=440.0):
    print(f"Generating {filename}...")
    sample_rate = 44100
    n_samples = int(sample_rate * duration)
    with wave.open(filename, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        data = [int(0.9 * math.sin(2 * math.pi * freq * i / sample_rate) * 32767) for i in range(n_samples)]
        w.writeframes(struct.pack('<' + 'h'*len(data), *data))
    return filename

def convert_audio(src, dest):
    print(f"Converting {src} -> {dest}...")
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", src, dest],
        capture_output=True
    )
    if result.returncode != 0:
        raise Exception(f"FFmpeg failed: {result.stderr.decode()[-200:]}")
    return dest

def test_pipeline(filename):
    stem_name = Path(filename).stem  # e.g. "test_wav"
    print(f"\n{'='*40}")
    print(f"Testing: {filename}")
    print(f"{'='*40}")

    # --- 1. Upload ---
    print("  [1/3] Uploading...")
    try:
        with open(filename, "rb") as f:
            response = requests.post(f"{BASE_URL}/upload/", files={"file": (filename, f)}, timeout=30)
    except requests.exceptions.ConnectionError:
        print("  FAILED: Cannot connect to backend on port 8000.")
        return False

    if response.status_code != 200:
        print(f"  FAILED: Upload returned {response.status_code}: {response.text[:200]}")
        return False

    data = response.json()
    file_id = data["file_id"]
    api_filename = data["filename"]
    print(f"  Upload OK â†’ file_id={file_id}")

    # --- 2. Trigger processing ---
    print("  [2/3] Starting processing...")
    proc = requests.post(f"{BASE_URL}/process/", json={
        "file_id": file_id,
        "filename": api_filename,
        "start_ms": 0,
        "end_ms": 3000
    }, timeout=30)

    if proc.status_code != 200:
        print(f"  FAILED: Process returned {proc.status_code}: {proc.text[:200]}")
        return False
    print("  Processing started (background task).")

    # --- 3. Poll for vocals stem (backend names it {stem}_vocals.mp3) ---
    # Backend stems: {stem_name}_vocals.mp3, {stem_name}_drums.mp3, etc.
    vocals_url = f"{BASE_URL}/processed/{file_id}/{stem_name}_vocals.mp3"
    print(f"  [3/3] Polling for vocals at: .../{file_id}/{stem_name}_vocals.mp3")
    print(f"        (Demucs on CPU takes ~3-8 min â€” timeout: 12 min)")

    max_wait_s = 720   # 12 minutes max
    poll_interval = 10 # check every 10 seconds
    elapsed = 0
    last_progress = -1

    while elapsed < max_wait_s:
        # Check progress endpoint
        try:
            prog_r = requests.get(f"{BASE_URL}/progress/{file_id}", timeout=5)
            if prog_r.status_code == 200:
                progress = prog_r.json().get("progress", 0)
                if progress != last_progress:
                    print(f"  Progress: {progress}%")
                    last_progress = progress
        except Exception:
            pass

        # Check if vocals file exists
        try:
            head_r = requests.head(vocals_url, timeout=5)
            if head_r.status_code == 200:
                print(f"\n  [OK] Vocals stem found after {elapsed}s!")

                # Bonus: check for other stems
                stems_found = []
                for s in ["vocals", "drums", "bass", "guitar", "piano", "other"]:
                    url = f"{BASE_URL}/processed/{file_id}/{stem_name}_{s}.mp3"
                    r = requests.head(url, timeout=5)
                    if r.status_code == 200:
                        stems_found.append(s)
                print(f"  Stems available: {stems_found}")
                return True
        except Exception:
            pass

        time.sleep(poll_interval)
        elapsed += poll_interval
        print(f"  ...waiting ({elapsed}s elapsed)", end="\r", flush=True)

    print(f"\n  FAILED: Timed out after {max_wait_s}s waiting for {vocals_url}")
    return False


def main():
    wav_file = "test_wav.wav"
    generate_wav(wav_file, duration=3.0)

    mp3_file = "test_mp3.mp3"
    flac_file = "test_flac.flac"
    try:
        convert_audio(wav_file, mp3_file)
        convert_audio(wav_file, flac_file)
    except Exception as e:
        print(f"Skipping MP3/FLAC tests â€” ffmpeg error: {e}")
        formats = [wav_file]
    else:
        formats = [wav_file, mp3_file, flac_file]

    results = {}
    for fname in formats:
        try:
            results[fname] = test_pipeline(fname)
        except Exception as e:
            print(f"Error testing {fname}: {e}")
            results[fname] = False

    print("\n" + "="*40)
    print("TEST SUMMARY")
    print("="*40)
    for fname, passed in results.items():
        print(f"  {'PASS âœ“' if passed else 'FAIL âœ—'}  {fname}")
    all_pass = all(results.values())
    print(f"\nOverall: {'ALL PASS' if all_pass else 'SOME FAILURES'}")
    return 0 if all_pass else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())

