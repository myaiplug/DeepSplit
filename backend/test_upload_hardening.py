import requests
import time
import uuid

BASE_URL = "http://localhost:8000"

def run_tests():
    print("Testing Audio Upload Hardening...")

    # 1. Test Oversized File
    upload_id = str(uuid.uuid4())
    headers = {"X-Upload-ID": upload_id}
    # Create 51MB of dummy data
    large_data = b"0" * (51 * 1024 * 1024)
    print("\n--- Test 1: Oversized File (> 50MB) ---")
    try:
        r = requests.post(f"{BASE_URL}/upload/", files={"file": ("large.mp3", large_data)}, headers=headers)
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.json()}")
    except Exception as e:
        print(f"Error: {e}")

    # 2. Test Fake MIME
    upload_id = str(uuid.uuid4())
    headers = {"X-Upload-ID": upload_id}
    fake_audio_data = b"This is a text file pretending to be an mp3."
    print("\n--- Test 2: Fake MIME type ---")
    try:
        r = requests.post(f"{BASE_URL}/upload/", files={"file": ("fake.mp3", fake_audio_data)}, headers=headers)
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.json()}")
    except Exception as e:
        print(f"Error: {e}")

    # 3. Test Progress Endpoint
    print("\n--- Test 3: Progress Endpoint Data ---")
    try:
        r = requests.get(f"{BASE_URL}/upload/progress/{upload_id}")
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.json()}")
    except Exception as e:
        print(f"Error: {e}")

    # 4. Test Rate Limiting
    print("\n--- Test 4: Rate Limiting ---")
    valid_data = b"ID3" + b"0" * 1024 # dummy valid-looking bytes just to pass basic stream block if we hit it fast
    try:
        # Our updated limit is 2/minute
        for i in range(4):
            uid = str(uuid.uuid4())
            r = requests.post(f"{BASE_URL}/upload/", files={"file": ("test.mp3", valid_data)}, headers={"X-Upload-ID": uid})
            print(f"Upload {i+1} Status Code: {r.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    time.sleep(1) # let server start
    run_tests()
