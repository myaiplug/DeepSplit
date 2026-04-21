const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let backendProcess;

// Determine paths based on packaging state
const isDev = !app.isPackaged;
const resourcesPath = isDev
  ? path.join(__dirname, '..')
  : process.resourcesPath;

const backendPath = path.join(resourcesPath, 'backend');
const frontendPath = isDev
  ? path.join(resourcesPath, 'frontend', 'dist')
  : path.join(resourcesPath, 'frontend');

// Python executable path
const getPythonPath = () => {
  if (process.platform === 'win32') {
    return isDev
      ? 'python'  // Use system Python in dev
      : path.join(backendPath, 'venv', 'Scripts', 'python.exe');
  } else {
    return isDev
      ? 'python3'
      : path.join(backendPath, 'venv', 'bin', 'python3');
  }
};

function startBackend() {
  const pythonPath = getPythonPath();
  const mainPy = path.join(backendPath, 'main.py');

  console.log('Starting backend:', pythonPath, mainPy);

  backendProcess = spawn(pythonPath, [
    '-m', 'uvicorn',
    'main:app',
    '--host', '127.0.0.1',
    '--port', '8000',
    '--log-level', 'info'
  ], {
    cwd: backendPath,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1'
    }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    backgroundColor: '#0a0f1d',
    titleBarStyle: 'default',
    show: false
  });

  // Wait for backend to start before loading frontend
  // Backend startup includes Python initialization, model loading, etc.
  // which can take 10-15 seconds on first run
  setTimeout(() => {
    if (isDev) {
      // In development, load frontend from Vite dev server
      // Note: Frontend dev server typically runs on port 5173, not 8000
      mainWindow.loadFile(path.join(frontendPath, 'index.html'));
    } else {
      // In production, load from local files
      mainWindow.loadFile(path.join(frontendPath, 'index.html'));
    }
  }, 10000);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // Start backend server
  startBackend();

  // Create main window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill backend process
  if (backendProcess) {
    backendProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// IPC handlers
ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-setting', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-setting', (event, key, value) => {
  store.set(key, value);
  return true;
});
