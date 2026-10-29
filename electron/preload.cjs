const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API bridge for Electron renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  appVersion: '1.0.0',
  platform: process.platform,
});
