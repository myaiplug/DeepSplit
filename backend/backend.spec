# backend.spec — PyInstaller spec for DeepSplit backend
# Run: pyinstaller backend.spec
# Output: dist/backend/ (folder with backend.exe, ~1-1.5 GB)

import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        # Include audio-separator model configs and data
        ('*.py', '.'),
    ],
    hiddenimports=[
        # FastAPI / uvicorn
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'starlette',
        'starlette.routing',
        'starlette.middleware',
        'starlette.middleware.cors',
        'starlette.staticfiles',
        'anyio',
        'anyio._backends._asyncio',
        # Pydantic
        'pydantic',
        'pydantic.v1',
        # Audio / ML
        'torch',
        'torch.nn',
        'onnxruntime',
        'onnxruntime.capi',
        'soundfile',
        'librosa',
        'librosa.core',
        'numpy',
        'scipy',
        'scipy.signal',
        # Demucs
        'demucs',
        'demucs.pretrained',
        'demucs.apply',
        'demucs.htdemucs',
        # audio-separator
        'audio_separator',
        'audio_separator.separator',
        # Misc
        'multipart',
        'python_multipart',
        'aiofiles',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'matplotlib', 'PyQt5', 'wx', 'gtk',
        'IPython', 'jupyter', 'notebook',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,       # Keep console for debug; set False for silent in production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='backend',
)
