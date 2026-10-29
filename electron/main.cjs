const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'ATAP - Threat Analysis Platform',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Load static HTML file for standalone 100% offline usage
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links safely in system default browser (deny in-app popups)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigation to unknown remote domains
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsed = new URL(navigationUrl);
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return;
    }
    if (parsed.protocol === 'file:') {
      return;
    }
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Application Menu Setup
function createMenu() {
  const menuTemplate = [
    {
      label: 'Súbor',
      submenu: [
        { label: 'Obnoviť / Reload', role: 'reload' },
        { label: 'Vynútiť obnovenie', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Ukončiť', role: 'quit' }
      ]
    },
    {
      label: 'Úpravy',
      submenu: [
        { label: 'Späť', role: 'undo' },
        { label: 'Znova', role: 'redo' },
        { type: 'separator' },
        { label: 'Vystrihnúť', role: 'cut' },
        { label: 'Kopírovať', role: 'copy' },
        { label: 'Vložiť', role: 'paste' },
        { label: 'Vybrať všetko', role: 'selectAll' }
      ]
    },
    {
      label: 'Zobrazenie',
      submenu: [
        { label: 'Celá obrazovka', role: 'togglefullscreen' },
        { label: 'Priblížiť', role: 'zoomIn' },
        { label: 'Oddialiť', role: 'zoomOut' },
        { label: 'Resetovať priblíženie', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Vývojárske nástroje', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Nápoveda',
      submenu: [
        {
          label: 'OWASP ASVS 5.0 Dokumentácia',
          click: async () => {
            await shell.openExternal('https://github.com/OWASP/ASVS');
          }
        },
        {
          label: 'O aplikácii ATAP',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'O aplikácii ATAP',
              message: 'ATAP - Application Threat Analysis Platform',
              detail: 'Verzia 1.0.0 Desktop (Offline Ready)\nOWASP ASVS 5.0 Workspace & STRIDE Threat Modeling System.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
