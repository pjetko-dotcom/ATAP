const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');

let mainWindow;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true';
  const appPagePath = path.resolve(__dirname, '../dist/index.html');

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
      sandbox: true,
      devTools: isDev,
    },
    autoHideMenuBar: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Load static HTML file for standalone 100% offline usage
    mainWindow.loadFile(appPagePath);
  }

  const openExternalHttpsUrl = (url) => {
    try {
      if (new URL(url).protocol === 'https:') {
        shell.openExternal(url).catch((error) => {
          console.error('Failed to open external URL:', error);
        });
      }
    } catch (error) {
      console.error('Rejected invalid external URL:', error);
    }
  };

  // Handle external links safely in system default browser (deny in-app popups)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalHttpsUrl(url);
    return { action: 'deny' };
  });

  // Keep the main frame on the app page; external HTTPS links open in the system browser.
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (isDev && parsed.origin === 'http://localhost:3000') {
        return;
      }
      if (!isDev && parsed.protocol === 'file:' && fileURLToPath(parsed) === appPagePath) {
        return;
      }
    } catch (error) {
      console.error('Rejected invalid navigation URL:', error);
    }

    event.preventDefault();
    openExternalHttpsUrl(navigationUrl);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Application Menu Setup
function createMenu(isDev) {
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
        ...(isDev ? [
          { type: 'separator' },
          { label: 'Vývojárske nástroje', role: 'toggleDevTools' }
        ] : [])
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
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true';
  createMenu(isDev);
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
