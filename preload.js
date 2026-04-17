// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Fenêtre & Titre ---
  syncTitleBar: (colors) => ipcRenderer.send('sync-titlebar', colors),
  createNewWindow: () => ipcRenderer.send('create-new-window'),

  // --- Auto-Updater ---
  // Déclenche le redémarrage et l'installation de la mise à jour téléchargée
  restartAndInstall: () => ipcRenderer.send('restart-and-install'),

  // Écouter les événements de mise à jour (utilisés par le frontend React)
  onUpdateAvailable:      (cb) => ipcRenderer.on('update-available',        (_e, info)     => cb(info)),
  onUpdateDownloadProgress:(cb) => ipcRenderer.on('update-download-progress', (_e, progress) => cb(progress)),
  onUpdateDownloaded:     (cb) => ipcRenderer.on('update-downloaded',       (_e, info)     => cb(info)),

  // Nettoyage des listeners (bonne pratique React)
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
  },
});
