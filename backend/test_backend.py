import requests
import time
import sys

def test_upload():
    url = "http://localhost:8000/upload/"
    # Create a dummy file
    with open("test.mp3", "wb") as f:
        f.write(b"dummy audio content")

    files = {'file': open('test.mp3', 'rb')}
    
    try:
        print("Attempting to upload file...")
        response = requests.post(url, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("Upload Successful!")
            return True
        else:
            print("Upload Failed")
            return False
    except requests.exceptions.ConnectionError:
        print("Could not connect to backend. Is it running?")
        return False
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

if __name__ == "__main__":
    # Wait for server to potentially start
    max_retries = 5
    for i in range(max_retries):
        if test_upload():
            break
        print(f"Retrying in 2 seconds... ({i+1}/{max_retries})")
        time.sleep(2)
