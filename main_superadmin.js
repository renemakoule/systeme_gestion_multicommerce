const { app, BrowserWindow, Menu, ipcMain, globalShortcut } = require('electron');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const { spawn } = require('child_process');
const isDev = !app.isPackaged;

// --- CONFIGURATION AUTO-UPDATER ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'renemakoule',
  repo: 'systeme_gestion_multicommerce',
});

let pyProc = null;
let mainWindow = null;

const isHex = (h) => /^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(h);

function startPython() {
  const isDev = !app.isPackaged;
  let script = path.join(__dirname, 'backend', 'main.py');
  
  if (isDev) {
    const pythonPath = path.join(__dirname, 'backend', 'venv', 'Scripts', 'python.exe');
    pyProc = spawn(pythonPath, [script]);
  } else {
    // Utilisation du dossier unpacked et process.resourcesPath
    // Le binaire est généré par PyInstaller dans backend/dist/main.exe
    const executablePath = path.join(process.resourcesPath, '..', 'app.asar.unpacked', 'backend', 'dist', 'main.exe');
    pyProc = spawn(executablePath);
  }

  if (pyProc != null) {
    pyProc.stdout.on('data', (data) => log.info(`Python: ${data}`));
    pyProc.stderr.on('data', (data) => log.error(`Python Error: ${data}`));
  }
}

async function checkBackendReady(url, timeoutMs = 15000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) return true;
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return false;
}

function createWindow(partition = 'persist:main') {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    show: false, // On ne montre pas tout de suite
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#71717a', height: 36 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition: partition 
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'frontend/out/superadmin.html'));
  } else {
    win.loadURL('http://localhost:3000');
  }

  // Health check avant affichage
  checkBackendReady('http://127.0.0.1:8001/api-test').then(isReady => {
      if (isReady) {
          win.show();
      } else {
          log.error("Backend non prêt après timeout ! (SuperAdmin)");
          win.show(); 
      }
  });
  
  if (!mainWindow) mainWindow = win;
  win.on('closed', () => { if (win === mainWindow) mainWindow = null; });

  return win;
}

// --- IPC HANDLERS ---
ipcMain.on('create-new-window', (event) => {
  const uniquePartition = `persist:session-${Date.now()}`;
  createWindow(uniquePartition);
});

ipcMain.on('sync-titlebar', (event, colors) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && colors.bg && colors.fg) {
    try {
      if (isHex(colors.bg) && isHex(colors.fg)) {
        mainWindow.setTitleBarOverlay({
          color: colors.bg,
          symbolColor: colors.fg,
          height: 36
        });
      }
    } catch (e) {
      console.error("Erreur critique TitleBar:", e.message);
    }
  }
});

app.whenReady().then(() => {
  startPython();
  createWindow();

  // Raccourci pour ouvrir les outils de développement en production (Ctrl+Shift+I)
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.openDevTools();
  });

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// --- AUTO-UPDATER EVENTS ---
autoUpdater.on('checking-for-update', () => { log.info('Vérification...'); });
autoUpdater.on('update-available', (info) => {
  log.info(`Mise à jour disponible : v${info.version}`);
  if (mainWindow) mainWindow.webContents.send('update-available', info);
});
autoUpdater.on('update-not-available', () => { log.info('App à jour.'); });
autoUpdater.on('download-progress', (progress) => {
  log.info(`Téléchargement : ${Math.round(progress.percent)}%`);
  if (mainWindow) mainWindow.webContents.send('update-download-progress', progress);
});
autoUpdater.on('update-downloaded', (info) => {
  log.info(`Mise à jour v${info.version} téléchargée.`);
  if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});
autoUpdater.on('error', (err) => { log.error('Erreur auto-updater :', err); });
ipcMain.on('restart-and-install', () => { autoUpdater.quitAndInstall(); });

app.on('will-quit', () => { if (pyProc != null) pyProc.kill(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
