from pathlib import Path
from utils import trim_audio

def test_ffmpeg_trim():
    print("Testing ffmpeg trim module direct invocation...")
    
    # 1. Lossless FLAC
    flac_in = Path("test_flac.flac")
    flac_out_stem = Path("test_flac_out")
    if flac_in.exists():
        out = trim_audio(flac_in, flac_out_stem, 1000, 3000)
        print(f"FLAC resulted in: {out} (Expected .flac without re-encoding)")
    
    # 2. Lossless WAV
    wav_in = Path("test_wav.wav")
    wav_out_stem = Path("test_wav_out")
    if wav_in.exists():
        out = trim_audio(wav_in, wav_out_stem, 1000, 3000)
        print(f"WAV resulted in: {out} (Expected .wav without re-encoding)")

    # 3. Lossy MP3
    mp3_in = Path("test_mp3.mp3")
    mp3_out_stem = Path("test_mp3_out")
    if mp3_in.exists():
        out = trim_audio(mp3_in, mp3_out_stem, 1000, 3000)
        print(f"MP3 resulted in: {out} (Expected .wav to prevent double-loss compression)")

if __name__ == "__main__":
    test_ffmpeg_trim()
