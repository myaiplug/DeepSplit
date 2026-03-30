# YouTube Stem Splitter Setup Guide

This guide will help you set up and run the DeepSplit YouTube stem splitter.

## Features

- **YouTube Video Download**: Download audio from YouTube videos or playlists in WAV, MP3, or FLAC format
- **High-Quality Stem Separation**: Split audio into 4-7 stems using Demucs, MDX-Net, or Roformer models:
  - 2-stem: Vocals, Instrumental
  - 4-stem: Vocals, Drums, Bass, Other
  - 5-stem: Vocals, Drums, Bass, Guitar, Other
  - 6-stem (default): Vocals, Drums, Bass, Guitar, Piano, Other
  - 7-stem: 6-stem + advanced drum separation (Kick, Snare, Hi-Hat, Overhead, Room)
- **Interactive Modal**: View and play all stems in a beautiful modal interface
- **Audio Preview**: Play each stem individually with volume controls
- **Download Options**: Download individual stems or all stems as a ZIP archive

## Prerequisites

### Backend Requirements

1. **Python 3.9+**
2. **FFmpeg** (required for audio processing)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install ffmpeg

   # macOS
   brew install ffmpeg

   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

3. **GPU Support (Optional but Recommended)**
   - NVIDIA GPU with CUDA support for faster processing
   - Install PyTorch with CUDA: https://pytorch.org/get-started/locally/

### Frontend Requirements

1. **Node.js 16+** and **npm** or **yarn**

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. (Optional) Install ClamAV for virus scanning:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install clamav clamav-daemon
   sudo systemctl start clamav-daemon

   # macOS
   brew install clamav
   brew services start clamav
   ```

### Frontend Setup

1. Navigate to the website directory:
   ```bash
   cd website
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

## Running the Application

### Start the Backend

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at http://localhost:8000

### Start the Frontend

```bash
cd website
npm run dev
# or
yarn dev
```

The website will be available at http://localhost:5173 (or the port shown in the terminal)

## Usage

1. Open the website in your browser
2. Navigate to the YouTube Splitter page
3. Paste a YouTube video or playlist URL
4. Select your desired output format (WAV, MP3, or FLAC)
5. Click "Split to High-Res Stems"
6. Wait for the processing to complete
7. When done, a modal will appear with all separated stems
8. Play, preview, and download individual stems or download all as a ZIP

## API Endpoints

- `POST /process_youtube/` - Start YouTube video processing
  - Body: `{ "url": "youtube_url", "format": "wav", "num_stems": 6 }`
- `GET /progress/{file_id}` - Check processing progress
- `GET /files/{file_id}` - Get list of processed files
- `POST /process_fx/` - Apply audio effects to stems
- `GET /presets/{stem_name}` - Get available FX presets for a stem type

## Troubleshooting

### Backend Issues

1. **ImportError for audio-separator or other packages**
   - Make sure you've activated the virtual environment
   - Run `pip install -r requirements.txt` again

2. **FFmpeg not found**
   - Install FFmpeg using the instructions above
   - Verify installation: `ffmpeg -version`

3. **CUDA/GPU errors**
   - The app will automatically fall back to CPU processing
   - For GPU support, ensure PyTorch is installed with CUDA

4. **ClamAV warnings**
   - ClamAV is optional; the app works without it
   - To enable, install and start the ClamAV daemon

### Frontend Issues

1. **Cannot connect to backend**
   - Ensure the backend is running on port 8000
   - Check CORS settings if accessing from a different origin

2. **Modal not appearing**
   - Check browser console for errors
   - Ensure all dependencies are installed

## Model Downloads

On first run, the audio-separator library will automatically download the required ML models:
- MDX-Net models (~50-100MB each)
- Demucs models (~100-300MB each)

Models are cached in `/tmp/audio-separator-models/` (or the configured directory)

## Performance Tips

1. **Use GPU acceleration** for 10-20x faster processing
2. **WAV format** provides the highest quality but larger file sizes
3. **6-stem mode** provides the best balance of quality and separation
4. **Playlists** are processed sequentially; consider processing videos individually for faster results

## License

See the main repository LICENSE file for details.
