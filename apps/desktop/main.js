const { app, BrowserWindow, session, Menu, ipcMain, desktopCapturer, Tray } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const Store = require('electron-store');
let mainWindow = null;
let tray = null;
let isQuitting = false;
let settingsWindow = null;
let localServer = null;

app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'http://localhost:8080');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('enable-features', 'WebRTCHardwareVideoEncoder');
app.commandLine.appendSwitch('disable-features', 'WidgetLayering');

const store = new Store({ defaults: { serverUrl: 'http://localhost:8080' } });

function createTray() {
  tray = new Tray(path.join(__dirname, 'src', 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir Relay', click: () => mainWindow?.show() },
    { type: 'separator' },
    {
      label: 'Sair do Relay',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('Relay');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function startInternalServer() {
  const webPath = app.isPackaged
    ? path.join(process.resourcesPath, 'web')
    : path.join(__dirname, '..', 'client', 'build', 'web');

  localServer = http.createServer((req, res) => {
    let safeUrl = req.url.split('?')[0];
    if (safeUrl === '/') safeUrl = '/index.html';

    const filePath = path.join(webPath, safeUrl);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        fs.readFile(path.join(webPath, 'index.html'), (fallbackErr, data) => {
          if (fallbackErr) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          }
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  localServer.listen(8080, '127.0.0.1');
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 860,
    minHeight: 560,
    title: 'Relay',
    backgroundColor: '#12151a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-main.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
  });

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.loadURL('http://localhost:8080');
  return win;
}

app.on('before-quit', () => {
  isQuitting = true;
});

function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 440,
    height: 240,
    resizable: false,
    title: 'Configurações do Relay',
    backgroundColor: '#12151a',
    parent: mainWindow ?? undefined,
    modal: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-settings.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.loadFile(path.join(__dirname, 'src', 'settings.html'));
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// --- AQUI ESTÁ A CORREÇÃO: UM ÚNICO BLOCO WHENREADY ---
app.whenReady().then(() => {
  startInternalServer();
  createTray();

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['media', 'notifications', 'display-capture'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] })
      .then((sources) => {
        if (sources.length > 0) {
          callback({ video: sources[0] });
        } else {
          callback({});
        }
      })
      .catch((err) => {
        console.error('Falha ao obter fontes de captura de tela:', err);
        callback({});
      });
  });

  ipcMain.handle('relay:get-server-url', () => store.get('serverUrl'));
  ipcMain.handle('relay:save-server-url', (_event, url) => {
    store.set('serverUrl', url);
    settingsWindow?.close();
    mainWindow?.loadURL(url);
    return true;
  });

  // CRIA A JANELA PRINCIPAL APENAS UMA VEZ!
  mainWindow = createMainWindow();

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Relay',
        submenu: [
          { label: 'Alterar servidor…', click: () => openSettingsWindow() },
          { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
          { type: 'separator' },
          { role: 'quit', label: 'Sair' },
        ],
      },
      { role: 'editMenu', label: 'Editar' },
      { role: 'viewMenu', label: 'Ver' },
      { role: 'windowMenu', label: 'Janela' },
    ]),
  );

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (localServer) {
    localServer.close();
  }
});