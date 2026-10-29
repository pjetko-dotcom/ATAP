const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API bridge for Electron renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  appVersion: '5.2.0',
  platform: process.platform,
});
