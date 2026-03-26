# build_backend_portable.ps1
# Creates a self-contained Python environment for DeepSplit bundling.
# Run once before electron:build. Output: backend/portable_python/
# This folder gets bundled as an extraResource in the Electron installer.
#
# Requirements:
#   - Internet connection (downloads Python embeddable, pip, packages)
#   - ~3-4 GB free disk space for deps (torch CPU + demucs)
#
# Usage:
#   cd C:\Users\15024\projects\DeepSplit
#   .\build_backend_portable.ps1

$ErrorActionPreference = "Stop"

$ROOT       = Split-Path -Parent $MyInvocation.MyCommand.Path
$TARGET     = "$ROOT\backend\portable_python"
$PYTHON_URL = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
$GET_PIP    = "https://bootstrap.pypa.io/get-pip.py"
$PYTHON_ZIP = "$ROOT\python_embed.zip"

Write-Host "=== DeepSplit Portable Python Build ===" -ForegroundColor Cyan

# 1. Clean previous build
if (Test-Path $TARGET) { Remove-Item $TARGET -Recurse -Force }
New-Item $TARGET -ItemType Directory | Out-Null

# 2. Download Python embeddable
if (-not (Test-Path $PYTHON_ZIP)) {
    Write-Host "[1/5] Downloading Python 3.11 embeddable..." -ForegroundColor Yellow
    Invoke-WebRequest $PYTHON_URL -OutFile $PYTHON_ZIP -UseBasicParsing
} else {
    Write-Host "[1/5] Python zip already downloaded, skipping." -ForegroundColor Green
}

# 3. Extract
Write-Host "[2/5] Extracting Python..." -ForegroundColor Yellow
Expand-Archive $PYTHON_ZIP -DestinationPath $TARGET -Force

# 4. Enable pip (uncomment site-packages in ._pth file)
$pthFile = Get-ChildItem $TARGET -Filter "python*._pth" | Select-Object -First 1
if ($pthFile) {
    $content = Get-Content $pthFile.FullName
    $content = $content -replace "#import site", "import site"
    Set-Content $pthFile.FullName $content
    Write-Host "  Enabled site-packages in $($pthFile.Name)" -ForegroundColor Green
}

# 5. Install pip
Write-Host "[3/5] Installing pip..." -ForegroundColor Yellow
Invoke-WebRequest $GET_PIP -OutFile "$TARGET\get-pip.py" -UseBasicParsing
& "$TARGET\python.exe" "$TARGET\get-pip.py" --no-warn-script-location

$PIP = "$TARGET\Scripts\pip.exe"

# 6. Install dependencies (CPU-only torch to keep size ~2GB not 5GB)
Write-Host "[4/5] Installing DeepSplit dependencies (this takes 5-15 min)..." -ForegroundColor Yellow

& $PIP install `
    "torch==2.2.2" "torchaudio==2.2.2" `
    --index-url "https://download.pytorch.org/whl/cpu" `
    --no-warn-script-location

& $PIP install `
    fastapi uvicorn[standard] pydantic `
    python-multipart aiofiles `
    audio-separator `
    demucs `
    soundfile librosa numpy scipy `
    --no-warn-script-location

# 7. Create the launcher script the Electron app will call
Write-Host "[5/5] Creating launcher..." -ForegroundColor Yellow
$launcher = @"
import sys, os
# Make sure our backend source is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))
import uvicorn
if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run('main:app', host='127.0.0.1', port=port, log_level='info')
"@
Set-Content "$TARGET\run_server.py" $launcher

Write-Host ""
Write-Host "=== Done! Portable Python at: $TARGET ===" -ForegroundColor Green
Write-Host "Size: $([math]::Round((Get-ChildItem $TARGET -Recurse | Measure-Object -Property Length -Sum).Sum / 1GB, 2)) GB"
Write-Host ""
Write-Host "Next: cd frontend && npm run electron:build" -ForegroundColor Cyan
