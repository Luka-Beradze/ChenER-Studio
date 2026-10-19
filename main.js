/**
 * Electron Main Process for ChenER Studio
 * Configured with offline window defaults, local asset loading, and security protections.
 */

const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Enforce single instance lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Build application native menu with standard desktop shortcuts
 */
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            createWindow();
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ChenER Studio',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About ChenER Studio',
              message: 'ChenER Studio — Standalone Desktop Modeler',
              detail:
                'Precision Chen-notation Entity-Relationship diagram modeling workspace.\nVersion: 1.0.0\nRunning offline with local storage and canvas rendering.',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create the main desktop application window with offline defaults
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'ChenER Studio — Entity-Relationship Diagram Modeler',
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    center: true,
    show: false, // Prevents white flash before content is ready
    backgroundColor: '#0f172a',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Security: Disable Node integration in renderer
      contextIsolation: true, // Security: Context isolation enabled
      sandbox: true, // Security: Run renderer in isolated sandbox
      webSecurity: true, // Enforce same-origin policy
      allowRunningInsecureContent: false, // Block mixed content
      spellcheck: false, // Performance: Diagram workspace does not need spellchecker
    },
  });

  // Smooth appearance when ready to prevent flicker
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Offline Window Default: Intercept external navigation
  // Prevents the window from navigating away from the local application
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsed = new URL(navigationUrl);
    const isLocal =
      parsed.protocol === 'file:' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1';

    if (!isLocal) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Offline Window Default: Intercept window.open / target="_blank"
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load the built offline distribution or dev server
  const distHtmlPath = path.join(__dirname, 'dist', 'index.html');
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV === 'true';

  if (isDev) {
    // In dev mode, attempt to load the Vite live-server URL with fallback to dist
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      if (fs.existsSync(distHtmlPath)) {
        mainWindow.loadFile(distHtmlPath);
      }
    });
  } else {
    // In standalone desktop mode, always load offline from local dist package
    if (fs.existsSync(distHtmlPath)) {
      mainWindow.loadFile(distHtmlPath);
    } else {
      // Fallback for development if dist has not been generated yet
      mainWindow.loadURL('http://localhost:3000').catch(() => {
        mainWindow.loadFile(path.join(__dirname, 'index.html'));
      });
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
