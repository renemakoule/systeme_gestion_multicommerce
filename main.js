const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

// --- CONFIGURATION AUTO-UPDATER ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
// Pointe explicitement vers le bon repo GitHub
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'renemakoule',
  repo: 'systeme_gestion_multicommerce',
});

let pyProc = null;
let mainWindow = null;

const isHex = (h) => /^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(h);

function startPython() {
  let script = path.join(__dirname, 'backend', 'main.py');
  if (isDev) {
    const pythonPath = path.join(__dirname, 'backend', 'venv', 'Scripts', 'python.exe');
    pyProc = spawn(pythonPath, [script]);
  } else {
    const executablePath = path.join(process.resourcesPath, 'backend', 'dist', 'main.exe');
    pyProc = spawn(executablePath);
  }

  if (pyProc != null) {
    pyProc.stdout.on('data', (data) => console.log(`Python: ${data}`));
    pyProc.stderr.on('data', (data) => console.error(`Python Error: ${data}`));
  }
}

function createWindow(partition = 'persist:main') {
  // Menu.setApplicationMenu(null); // On peut garder cette ligne si on veut supprimer le menu natif

  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 600,
    minHeight: 500,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
        color: '#00000000',
        symbolColor: '#71717a',
        height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      partition: partition // Utilisation de la partition pour l'isolation de session
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, 'frontend/out/index.html'));
  }

  win.once('ready-to-show', () => win.show());
  
  // Si c'est la fenêtre principale originelle (optionnel, selon votre logique)
  if (!mainWindow) mainWindow = win;

  win.on('closed', () => { 
    if (win === mainWindow) mainWindow = null;
  });

  return win;
}

// --- IPC HANDLERS ---
ipcMain.on('create-new-window', (event) => {
  // Création d'une fenêtre avec un partition ID unique pour l'isolation de session
  const uniquePartition = `persist:session-${Date.now()}`;
  createWindow(uniquePartition);
});

ipcMain.on('sync-titlebar', (event, colors) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && colors.bg && colors.fg) {
    try {
      // On n'applique que si les deux couleurs sont au format Hex valide
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

  // --- CONFIGURATION AUTO-UPDATER (SCÉNARIO 2) ---
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// --- AUTO-UPDATER EVENTS ---
autoUpdater.on('checking-for-update', () => {
  log.info('Vérification des mises à jour...');
});

autoUpdater.on('update-available', (info) => {
  log.info(`Mise à jour disponible : v${info.version}`);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', () => {
  log.info('Application à jour.');
});

autoUpdater.on('download-progress', (progress) => {
  const msg = `Téléchargement : ${Math.round(progress.percent)}% (${Math.round(progress.bytesPerSecond / 1024)} KB/s)`;
  log.info(msg);
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', progress);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info(`Mise à jour v${info.version} téléchargée. Installation au prochain redémarrage.`);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (err) => {
  log.error('Erreur auto-updater :', err);
});

// IPC : Le frontend peut déclencher l'installation manuellement
ipcMain.on('restart-and-install', () => {
  autoUpdater.quitAndInstall();
});

app.on('will-quit', () => {
  if (pyProc != null) pyProc.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});