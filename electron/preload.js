const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveServerUrl: (url) => ipcRenderer.invoke('save-server-url', url),
    getServerUrl: () => ipcRenderer.invoke('get-server-url'),
    clearServerUrl: () => ipcRenderer.invoke('clear-server-url'),
    openConfig: () => ipcRenderer.invoke('open-config'),
    openWebView: (url) => ipcRenderer.invoke('open-webview', url),
    onLoadUrl: (callback) => ipcRenderer.on('load-url', (event, url) => callback(url))
});
