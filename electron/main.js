const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store').default;

const store = new Store();
let mainWindow;

function createConfigWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile('renderer/config.html');
}

function createWebViewWindow(serverUrl) {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: false
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile('renderer/webview.html');
    
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('load-url', serverUrl);
    });
}

app.whenReady().then(() => {
    const savedUrl = store.get('serverUrl');
    
    if (savedUrl) {
        createWebViewWindow(savedUrl);
    } else {
        createConfigWindow();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createConfigWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('save-server-url', async (event, url) => {
    store.set('serverUrl', url);
    return true;
});

ipcMain.handle('get-server-url', async () => {
    return store.get('serverUrl');
});

ipcMain.handle('clear-server-url', async () => {
    store.delete('serverUrl');
    return true;
});

ipcMain.handle('open-config', async () => {
    mainWindow.close();
    createConfigWindow();
    return true;
});

ipcMain.handle('open-webview', async (event, url) => {
    mainWindow.close();
    createWebViewWindow(url);
    return true;
});
