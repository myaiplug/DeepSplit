const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

// ── Logging ──────────────────────────────────────────────────────────────────
const LOG_FILE = path.join(app.getPath('userData'), 'stemsplit_debug.log');
function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    try { fs.appendFileSync(LOG_FILE, line); } catch (_) { }
    console.log(msg);
}

let mainWindow;
let pythonProcess;
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;
const isDev = !app.isPackaged;

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1340,
        height: 860,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#00000000', // Transparent
        frame: false, // Frameless
        show: false, // Don't show until ready
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Fade in
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    if (isDev) {
        const startUrl = process.env.ELECTRON_START_URL || `http://localhost:${FRONTEND_PORT}`;
        log(`DEV mode: loading ${startUrl}`);
        mainWindow.loadURL(startUrl);
    } else {
        const prodUrl = `http://localhost:${BACKEND_PORT}/app`;
        log(`PROD mode: loading from Vite build at dist/index.html`);
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Backend ───────────────────────────────────────────────────────────────────
function getBackendExe() {
    if (isDev) {
        // Dev: use system Python
        return { cmd: 'C:\\Python313\\python.exe', args: ['-m', 'uvicorn', 'main:app', '--port', String(BACKEND_PORT)], cwd: path.join(__dirname, '../../backend') };
    }
    // Production: use bundled portable Python + backend source from extraResources
    const portablePython = path.join(process.resourcesPath, 'portable_python', 'python.exe');
    const backendApp    = path.join(process.resourcesPath, 'app');
    const runScript     = path.join(process.resourcesPath, 'portable_python', 'run_server.py');
    log(`Production python: ${portablePython}`);
    log(`Backend app dir:   ${backendApp}`);
    return { cmd: portablePython, args: [runScript, String(BACKEND_PORT)], cwd: backendApp };
}

function startBackend() {
    const { cmd, args, cwd } = getBackendExe();
    log(`Starting backend: ${cmd} ${args.join(' ')} (cwd: ${cwd})`);

    pythonProcess = spawn(cmd, args, { cwd, shell: false });

    pythonProcess.on('error', err => log(`Backend spawn error: ${err.message}`));
    pythonProcess.stdout?.on('data', d => log(`BE: ${d.toString().trim()}`));
    pythonProcess.stderr?.on('data', d => log(`BE ERR: ${d.toString().trim()}`));
    pythonProcess.on('close', code => log(`Backend exited: ${code}`));
}

function stopBackend() {
    if (!pythonProcess) return;
    log('Stopping backend...');
    if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(pythonProcess.pid), '/f', '/t']);
    } else {
        pythonProcess.kill('SIGTERM');
    }
    pythonProcess = null;
}

// ── Wait for backend to be ready ──────────────────────────────────────────────
function waitForBackend(retries = 30, interval = 1000) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            http.get(`http://127.0.0.1:${BACKEND_PORT}/`, res => {
                log(`Backend ready (HTTP ${res.statusCode})`);
                resolve();
            }).on('error', () => {
                attempts++;
                if (attempts >= retries) {
                    reject(new Error('Backend did not start in time'));
                } else {
                    setTimeout(check, interval);
                }
            });
        };
        check();
    });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.on('ready', async () => {
    log(`App ready. isDev=${isDev}, resourcesPath=${process.resourcesPath || 'N/A'}`);
    startBackend();

    if (!isDev) {
        // In production, wait for backend before showing window to avoid blank screen
        try {
            await waitForBackend(40, 1000);
        } catch (e) {
            log(`Warning: ${e.message} — opening window anyway`);
        }
    }

    createWindow();
});

app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

app.on('before-quit', () => stopBackend());

// ── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.on('window-control', (event, action) => {
    if (!mainWindow) return;
    switch (action) {
        case 'minimize': mainWindow.minimize(); break;
        case 'maximize': 
            if (mainWindow.isMaximized()) mainWindow.unmaximize();
            else mainWindow.maximize();
            break;
        case 'close': mainWindow.close(); break;
    }
});
