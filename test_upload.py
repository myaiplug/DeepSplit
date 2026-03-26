import requests
import os

def test_upload():
    url = "http://localhost:8000/upload/"
    # Create a dummy file
    with open("test_audio.mp3", "wb") as f:
        f.write(b"dummy audio content")

    try:
        with open('test_audio.mp3', 'rb') as f:
            files = {'file': f}
            response = requests.post(url, files=files)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists("test_audio.mp3"):
            os.remove("test_audio.mp3")

if __name__ == "__main__":
    test_upload()
