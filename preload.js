// preload.js
window.addEventListener('DOMContentLoaded', () => {
    console.log('Interface chargée avec succès');
});


const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  syncTitleBar: (colors) => ipcRenderer.send('sync-titlebar', colors),
  createNewWindow: () => ipcRenderer.send('create-new-window')
});