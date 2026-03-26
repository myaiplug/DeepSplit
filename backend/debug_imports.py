import sys
import time

def log(msg):
    print(f"[DEBUG] {msg}")
    sys.stdout.flush()

try:
    log("Importing fastapi...")
    import fastapi
    log("FastAPI imported.")

    log("Importing torch...")
    import torch
    log("Torch imported.")

    log("Importing demucs...")
    # diverse demucs imports
    import demucs.separate
    log("Demucs imported.")

    log("Importing pedalboard...")
    import pedalboard
    log("Pedalboard imported.")
    
    log("Importing main application...")
    import main
    log("Main application imported successfully.")

except Exception as e:
    log(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

log("Debug script completed.")
