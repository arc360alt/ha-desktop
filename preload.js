const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveServer: (url) => ipcRenderer.invoke('save-server', url),
  getServer: () => ipcRenderer.invoke('get-server'),
  resetServer: () => ipcRenderer.invoke('reset-server'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  navigateBack: () => ipcRenderer.invoke('navigate-back'),
  navigateReload: () => ipcRenderer.invoke('navigate-reload'),
  onTriggerBack: (callback) => ipcRenderer.on('trigger-back', callback),
  onTriggerReload: (callback) => ipcRenderer.on('trigger-reload', callback),
});
