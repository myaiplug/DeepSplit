"""
Quick standalone test to run the hybrid separation and print exact errors.
"""
import asyncio
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout, format='%(asctime)s %(levelname)s %(message)s')

async def main():
    from separator import AudioSeparator
    
    test_file = Path("test_wav.wav")
    if not test_file.exists():
        import wave, struct, math
        sample_rate = 44100
        n_samples = int(sample_rate * 3.0)
        with wave.open(str(test_file), 'w') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sample_rate)
            data = [int(0.5 * math.sin(2 * math.pi * 440 * i / sample_rate) * 32767) for i in range(n_samples)]
            w.writeframes(struct.pack('<' + 'h'*len(data), *data))
        print(f"Generated {test_file}")
    
    out_dir = Path("test_sep_output")
    out_dir.mkdir(exist_ok=True)
    
    print("Creating AudioSeparator...")
    sep = AudioSeparator(out_dir)
    
    print("Running separate_stems...")
    try:
        result = await sep.separate_stems(test_file, original_filename="test", num_stems=4)
        print(f"SUCCESS: {result}")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(main())
