const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  platform: process.platform
});
