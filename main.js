const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater'); // Import pour les mises à jour auto
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

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

// Logs et événements pour le suivi de la mise à jour (Optionnel)
autoUpdater.on('update-available', () => {
  console.log('Mise à jour disponible ! Téléchargement en cours...');
});

autoUpdater.on('update-downloaded', () => {
  console.log('Mise à jour téléchargée. Elle sera installée au prochain redémarrage.');
  // On pourrait envoyer un message IPC au frontend ici pour prévenir le gérant
});

app.on('will-quit', () => {
  if (pyProc != null) pyProc.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});