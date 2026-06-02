# DeepSplit Desktop Application

Professional offline AI stem separation for Windows and macOS.

## Features

- **Multiple AI Models**: htdemucs, MDX23C, Roformer, Demucs, DrumSep
- **2-7 Stem Separation**: From simple vocals/instrumental to advanced 7-stem with drum sub-separation
- **Professional FX Chains**: 5+ pedalboard effects per stem type (vocals, drums, bass, other)
- **GPU Accelerated**: 10-20x faster with NVIDIA CUDA support
- **100% Offline**: All processing on your computer, no internet required
- **Cross-Platform**: Native Windows and macOS applications

## Building the Desktop Installer

### Prerequisites

#### For Windows:
- Node.js 18+ (for Electron)
- Python 3.9+ (for backend)
- NSIS (for installer creation)
- Git

#### For macOS:
- Node.js 18+ (for Electron)
- Python 3.9+ (for backend)
- Xcode Command Line Tools
- Git

### Build Steps

#### 1. Setup Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
pip install pyinstaller
```

#### 2. Build Backend Executable

```bash
# Still in backend directory with venv activated
pyinstaller backend.spec

# This creates dist/backend/ with the executable
```

#### 3. Setup Electron App

```bash
cd ../desktop-app
npm install
```

#### 4. Build Website Frontend

```bash
cd ../website
npm install
npm run build
# Creates website/dist/
```

#### 5. Build Desktop Installer

```bash
cd ../desktop-app

# For Windows (.exe installer)
npm run build:win

# For macOS (.dmg installer)
npm run build:mac

# For both
npm run build
```

The installers will be in `desktop-app/dist/`:
- Windows: `DeepSplit-Setup-1.0.0.exe`
- macOS: `DeepSplit-1.0.0.dmg`

### Installer Size & Requirements

- **Installer Size**: ~200-500 MB (includes Python runtime, AI models, dependencies)
- **Installed Size**: ~1.5-2 GB (with all models downloaded)
- **System Requirements**:
  - Windows: 10 or later (64-bit)
  - macOS: 11 (Big Sur) or later (Universal binary for Intel & Apple Silicon)
  - RAM: 8 GB minimum, 16 GB recommended
  - GPU: Optional but recommended (NVIDIA with CUDA support)

## Included Models

The installer includes support for the following AI models (downloaded on first use):

### Vocal Separation
- **Kim_Vocal_2.onnx**: MDX high-quality vocal extraction
- **MDX23C-8KFFT-InstVoc_HQ.ckpt**: Latest MDX23C vocal model

### Multi-Stem Separation
- **htdemucs.yaml**: Hybrid Transformer Demucs (4-stem)
- **htdemucs_ft.yaml**: Fine-tuned htdemucs (best quality 4-stem)
- **htdemucs_6s.yaml**: 6-stem version (vocals, drums, bass, guitar, piano, other)

### Experimental
- **model_bs_roformer_ep_317_sdr_12.9755.ckpt**: Roformer model
- **MDX23C_DrumSep_full_compressed_022024.onnx**: Advanced drum sub-separation

### Drum Sub-Separation
- Separates drums into: Kick, Snare, Hi-Hat, Overhead, Room

## Using the Desktop App

1. **Launch DeepSplit** from your applications folder
2. **Select audio file** or drag & drop
3. **Choose settings**:
   - Stem count (2, 4, 5, 6, or 7)
   - Output format (WAV, MP3, FLAC)
   - AI model (auto, htdemucs, mdx23c, roformer)
4. **Click "Split Stems"**
5. **Apply FX** (optional): Each stem gets 5+ professional effect presets
6. **Export stems** individually or as ZIP

## FX Presets

### Vocals (5 presets)
1. Crystal Clear - Noise gate + compression + clarity
2. Studio Presence - Presence boost + air + limiting
3. Lush Verb - Reverb + chorus for depth
4. Dry Tight - Aggressive gate + tight compression
5. Broadcast - Heavy compression + limiting for radio sound

### Drums (5 presets)
1. Punchy Kick - Low-end boost + punch compression
2. Crisp Snare - Saturation + snap + reverb
3. Room Killer - Noise gate for clean drums
4. Bus Glue - Compression + tape warmth
5. LoFi Grit - Bitcrush + compression for vintage sound

### Bass (5 presets)
1. Sub Focus - Isolate lows + compression
2. Fuzz Box - Heavy distortion + scooped mids
3. Even Dynamics - Heavy compression for consistency
4. Note Definition - Attack freq boost + clarity
5. Rumble Eater - HPF + hum removal

### Other/Guitar/Piano (5 presets)
1. Stereo Widen - Chorus-based widening + air
2. Warm Tape - Saturation + vintage filtering
3. Clean Rhythm - Compression + clarity
4. Shimmer - Reverb + chorus for atmosphere
5. Background - Push back in mix with reverb

## Development

To run in development mode:

```bash
# Terminal 1: Start backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python -m uvicorn main:app --reload

# Terminal 2: Start Electron
cd desktop-app
npm start
```

## Troubleshooting

### Windows
- If installer is blocked: Right-click > Properties > Unblock
- CUDA not found: Install NVIDIA CUDA Toolkit 11.8 or later
- Models not downloading: Check firewall settings

### macOS
- If app won't open: System Preferences > Security & Privacy > Allow
- For M1/M2/M3: Uses optimized Apple Silicon binaries
- Models location: `~/Library/Application Support/DeepSplit/models`

## License

MIT License - See LICENSE file for details

## Credits

- Built with Electron, FastAPI, audio-separator
- Models: htdemucs (Meta), MDX (UVR), Roformer
- FX Engine: Spotify Pedalboard
