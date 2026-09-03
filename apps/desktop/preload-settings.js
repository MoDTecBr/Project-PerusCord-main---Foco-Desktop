const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('relayDesktop', {
  getServerUrl: () => ipcRenderer.invoke('relay:get-server-url'),
  saveServerUrl: (url) => ipcRenderer.invoke('relay:save-server-url', url),
});
