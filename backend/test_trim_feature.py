import requests
import time
import uuid

BASE_URL = "http://localhost:8000"

def test_trim():
    print("Testing Audio Trimming enhancements...")
    
    # 1. Upload a dummy mp3 and process it
    upload_id = str(uuid.uuid4())
    headers = {"X-Upload-ID": upload_id}
    # Create ~100kb valid dummy MP3 data (just mock data for testing)
    mp3_data = b"ID3" + b"0" * (100 * 1024)
    r = requests.post(f"{BASE_URL}/upload/", files={"file": ("test_trim.mp3", mp3_data)}, headers=headers)
    
    # If hit by rate limits from before, wait a bit
    if r.status_code == 429:
        print("Rate limited stringing upload test. Waiting 30 seconds...")
        time.sleep(30)
        upload_id = str(uuid.uuid4())
        headers = {"X-Upload-ID": upload_id}
        r = requests.post(f"{BASE_URL}/upload/", files={"file": ("test_trim.mp3", mp3_data)}, headers=headers)

    # Wait, the bytes might fail the pyclamd scan or Py-magic test if it's not a real MP3!
    # Instead, we will test the process limits endpoint by passing absurd values to an existing file_id
    
    print("\n--- Test Region Bounds ---")
    data = {
        "file_id": "dummy_123",
        "filename": "dummy.mp3",
        "start_ms": 10000,
        "end_ms": 5000,
        "num_stems": 2
    }
    r = requests.post(f"{BASE_URL}/process/", json=data)
    print(f"Test start > end: {r.status_code} - {r.json()}")
    
    data["start_ms"] = 1000
    data["end_ms"] = 3000
    r = requests.post(f"{BASE_URL}/process/", json=data)
    print(f"Test duration < 3s: {r.status_code} - {r.json()}")
    
if __name__ == "__main__":
    test_trim()
