# DeepSplit - Professional AI Stem Separation

Split any audio into high-quality stems using state-of-the-art AI models. Available as a desktop application for Windows and macOS.

## 🎵 Features

- **Multiple AI Models**: htdemucs, MDX23C, Roformer, Demucs, DrumSep
- **2-7 Stem Modes**: From simple vocal extraction to advanced 7-stem with drum sub-separation
- **Professional FX Engine**: 25+ pedalboard effects across 5 presets per stem type
- **GPU Accelerated**: 10-20x faster processing with NVIDIA CUDA
- **100% Offline**: All processing on your computer, no cloud required
- **Cross-Platform**: Native Windows and macOS applications

## 📥 Download Desktop App

### Windows (10+)
Download `DeepSplit-Setup-1.0.0.exe` from [Releases](https://github.com/myaiplug/DeepSplit/releases)

**Installer Size**: ~200 MB | **Installed Size**: ~1.5 GB

### macOS (11+)
Download `DeepSplit-1.0.0.dmg` from [Releases](https://github.com/myaiplug/DeepSplit/releases)

**Universal Binary**: Works on both Intel and Apple Silicon (M1/M2/M3)

## 🚀 Quick Start

1. **Download** the installer for your platform
2. **Install** DeepSplit (Windows: run .exe | macOS: drag to Applications)
3. **Launch** the app
4. **Drag & drop** your audio file
5. **Choose** stem count and AI model
6. **Split** - processing happens locally on your machine
7. **Apply FX** (optional) - enhance each stem with professional effects
8. **Export** stems individually or as a ZIP

## 🎚️ Stem Separation Modes

| Mode | Outputs | Best For |
|------|---------|----------|
| **2-Stem** | Vocals, Instrumental | Quick vocal extraction |
| **4-Stem** | Vocals, Drums, Bass, Other | Standard mixing/remixing |
| **5-Stem** | + Guitar | Rock, pop music |
| **6-Stem** | + Piano | Complex arrangements |
| **7-Stem** | + Kick, Snare, Hi-Hat, OH, Room | Advanced drum production |

## 🎛️ FX Presets (5 per Stem Type)

### Vocals
1. **Crystal Clear** - Noise gate + compression + clarity
2. **Studio Presence** - Presence boost + air + limiting
3. **Lush Verb** - Reverb + chorus for depth
4. **Dry Tight** - Aggressive gate + tight compression
5. **Broadcast** - Radio-ready compression + limiting

### Drums
1. **Punchy Kick** - Low-end boost + punch
2. **Crisp Snare** - Saturation + snap + space
3. **Room Killer** - Gate for isolated drums
4. **Bus Glue** - Tape warmth + compression
5. **LoFi Grit** - Vintage bitcrushed sound

### Bass
1. **Sub Focus** - Isolate lows + control
2. **Fuzz Box** - Heavy distortion + character
3. **Even Dynamics** - Consistent compression
4. **Note Definition** - Attack clarity + punch
5. **Rumble Eater** - Clean low-end filtering

### Other/Guitar/Piano
1. **Stereo Widen** - Spatial enhancement
2. **Warm Tape** - Analog saturation
3. **Clean Rhythm** - Controlled dynamics
4. **Shimmer** - Atmospheric reverb
5. **Background** - Sit-back-in-mix processing

## 🤖 AI Models

| Model | Quality | Speed | Best For |
|-------|---------|-------|----------|
| **htdemucs** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Highest quality, balanced |
| **MDX23C** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Fast processing |
| **Roformer** | ⭐⭐⭐⭐ | ⭐⭐⭐ | Experimental, unique sound |
| **Demucs v4** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Good balance |
| **DrumSep** | ⭐⭐⭐⭐⭐ | ⭐⭐ | Advanced drum splitting |

## 💻 System Requirements

### Minimum
- **CPU**: Intel i5 / AMD Ryzen 5 (4 cores)
- **RAM**: 8 GB
- **Storage**: 3 GB free space
- **OS**: Windows 10 (64-bit) / macOS 11+

### Recommended
- **CPU**: Intel i7 / AMD Ryzen 7 (8+ cores)
- **RAM**: 16 GB
- **GPU**: NVIDIA GTX 1060 or better (with CUDA)
- **Storage**: 5 GB free space (SSD recommended)
- **OS**: Windows 11 / macOS 13+

## 🛠️ Building from Source

See [desktop-app/README.md](desktop-app/README.md) for detailed build instructions.

### Quick Build

```bash
# 1. Build backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install pyinstaller
pyinstaller backend.spec

# 2. Build website
cd ../website
npm install
npm run build

# 3. Build desktop installer
cd ../desktop-app
npm install
npm run build  # Creates installers in desktop-app/dist/
```

## 📖 Documentation

- **User Guide**: [desktop-app/README.md](desktop-app/README.md)
- **API Documentation**: [backend/README.md](YOUTUBE_SETUP.md)
- **Developer Guide**: [CONTRIBUTING.md](CONTRIBUTING.md) _(coming soon)_

## 🎯 Use Cases

- **Music Production**: Extract vocals for remixing
- **Karaoke**: Create backing tracks
- **Sampling**: Isolate instruments for beats
- **Learning**: Study individual instrument parts
- **Podcasting**: Remove music from speech
- **Research**: Audio analysis and separation

## 🔐 Privacy & Security

- **100% Offline**: All processing happens locally
- **No Telemetry**: We don't collect any usage data
- **Open Source**: Audit the code yourself
- **No Account Required**: Download and use immediately

## 📜 License

MIT License - See [LICENSE](LICENSE) for details

## 🙏 Credits

- **Models**: htdemucs (Meta), MDX (UVR), Roformer, DrumSep
- **FX Engine**: Spotify Pedalboard
- **Framework**: Electron, FastAPI, audio-separator
- **Community**: Ultimate Vocal Remover (UVR) community

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/myaiplug/DeepSplit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/myaiplug/DeepSplit/discussions)

## 🌟 Star History

If you find DeepSplit useful, please star the repository!

---

**Made with ❤️ for the audio production community**
