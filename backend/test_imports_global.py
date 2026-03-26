import sys
print(f"Python: {sys.executable}")
try:
    import fastapi
    print("fastapi: OK")
except ImportError as e:
    print(f"fastapi: FAIL {e}")

try:
    import uvicorn
    print("uvicorn: OK")
except ImportError as e:
    print(f"uvicorn: FAIL {e}")

try:
    import audio_separator
    print("audio_separator: OK")
    from audio_separator.separator import Separator
    print("audio_separator.separator: OK")
except ImportError as e:
    print(f"audio_separator: FAIL {e}")

try:
    import pydub
    print("pydub: OK")
except ImportError as e:
    print(f"pydub: FAIL {e}")

try:
    import torch
    print("torch: OK")
except ImportError as e:
    print(f"torch: FAIL {e}")

try:
    import pedalboard
    print("pedalboard: OK")
except ImportError as e:
    print(f"pedalboard: FAIL {e}")
