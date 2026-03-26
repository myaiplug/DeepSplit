import asyncio
from pathlib import Path
from separator import AudioSeparator

async def test_mdx_drums():
    print("Testing MDX 23C Drum Separator output keys...")
    sep = AudioSeparator(use_gpu=True)
    sep.output_dir = Path("test_drum_output")
    sep.separator.output_dir = "test_drum_output"
    sep.output_dir.mkdir(exist_ok=True)
    
    test_drum_file = Path("test_wav.wav")  # dummy file, just testing if it runs
    if test_drum_file.exists():
        try:
            # We bypass the HTTP layer to directly test the drum node execution
            out = await sep.separate_drums(test_drum_file)
            print(f"Drum parsing successful. Models created: {out}")
        except Exception as e:
            print(f"Exception generated during model loading/execution: {e}")
    else:
        print("Test file 'test_wav.wav' missing. Please provide test material.")

if __name__ == "__main__":
    asyncio.run(test_mdx_drums())
