import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';
import { registerFsHandlers } from './ipc/fs.handler';
import { registerUpdaterHandlers } from './ipc/updater.handler';

// Disable hardware acceleration on some configurations to prevent blank windows
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Charles24 Việt Hóa',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      // Security: no node integration in renderer
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: join(__dirname, '../preload/index.js'),
    },
  });

  // Dev: load Vite dev server; Prod: load built HTML
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Window controls via IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());
}

app.whenReady().then(() => {
  createWindow();

  registerFsHandlers(ipcMain);

  if (mainWindow) {
    registerUpdaterHandlers(ipcMain, autoUpdater, mainWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Open external links in default browser, not in Electron
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
});
