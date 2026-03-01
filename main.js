const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window objects
let mainWindow = null;
let setupWindow = null;

// Path to store config
const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return null;
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving config:', e);
    return false;
  }
}

function applyMediaPermissions(ses) {
  const allowed = ['media', 'audioCapture', 'videoCapture', 'microphone', 'camera', 'notifications'];
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowed.includes(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => {
    return allowed.includes(permission);
  });
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 520,
    height: 620,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#111318',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
  });

  setupWindow.loadFile('setup.html');

  setupWindow.on('closed', () => {
    setupWindow = null;
  });
}

function createMainWindow(serverUrl) {
  // Normalize the URL robustly
  let url = serverUrl.trim();
  // Strip any accidental leading/trailing quotes
  url = url.replace(/^["']|["']$/g, '');
  // Add http:// if no protocol given (covers 192.168.x.x:8123, homeassistant.local:8123, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  // Remove trailing slash
  url = url.replace(/\/$/, '');

  const config = loadConfig();
  const useSystemBorders = config?.systemBorders ?? false;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  frame: useSystemBorders,
  titleBarStyle: useSystemBorders ? 'default' : 'hidden',
    backgroundColor: '#111318',
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,
      contextIsolation: false,
      webviewTag: true,
      // Persist session data (cookies, localStorage, etc.)
      partition: 'persist:homeassistant',
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
  });

  mainWindow.removeMenu();

  // Apply mic/media permissions to the webview session when it attaches
  mainWindow.webContents.on('did-attach-webview', (_event, webviewContents) => {
    applyMediaPermissions(webviewContents.session);
  });

  // Load the wrapper HTML which contains the custom titlebar + webview
  mainWindow.loadFile('app.html', {
    query: { url: url }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC handlers
ipcMain.handle('save-server', async (event, serverUrl) => {
  const config = { serverUrl };
  const saved = saveConfig(config);
  if (saved) {
    createMainWindow(serverUrl);
    if (setupWindow) {
      setupWindow.close();
    }
  }
  return saved;
});

ipcMain.handle('get-server', async () => {
  const config = loadConfig();
  return config ? config.serverUrl : null;
});

ipcMain.handle('reset-server', async (event) => {
  try {
    // Delete config file
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    // Clear persisted session data (cookies, localStorage, cache)
    const ses = session.fromPartition('persist:homeassistant');
    await ses.clearStorageData();
    await ses.clearCache();

    // Open setup window
    createSetupWindow();

    // Close the main window that triggered this
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      // Small delay so setup window is visible before main closes
      setTimeout(() => win.close(), 150);
    }

    return true;
  } catch (e) {
    console.error('Error resetting:', e);
    return false;
  }
});

ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('window-is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isMaximized() : false;
});

ipcMain.handle('navigate-back', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win.webContents) {
    // We need to tell the webview inside app.html to go back
    win.webContents.send('trigger-back');
  }
});

ipcMain.handle('navigate-reload', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win.webContents) {
    win.webContents.send('trigger-reload');
  }
});

ipcMain.handle('set-frame', (event, enabled) => {
  const config = loadConfig();
  if (config) {
    config.systemBorders = enabled;
    saveConfig(config);
  }
});

app.whenReady().then(() => {
  // Apply permissions to the persisted HA session at startup
  applyMediaPermissions(session.fromPartition('persist:homeassistant'));

  const config = loadConfig();

  if (config && config.serverUrl) {
    createMainWindow(config.serverUrl);
  } else {
    createSetupWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const cfg = loadConfig();
      if (cfg && cfg.serverUrl) {
        createMainWindow(cfg.serverUrl);
      } else {
        createSetupWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});