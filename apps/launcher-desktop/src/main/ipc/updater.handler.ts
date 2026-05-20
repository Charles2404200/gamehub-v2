import { IpcMain, BrowserWindow } from 'electron';
import type { AppUpdater } from 'electron-updater';

/**
 * Registers electron-updater event forwarding to the renderer.
 * The renderer listens for 'updater:*' events via preload IPC.
 */
export function registerUpdaterHandlers(
  ipcMain: IpcMain,
  autoUpdater: AppUpdater,
  win: BrowserWindow,
): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Forward updater events to renderer
  const send = (channel: string, data?: unknown) => {
    win.webContents.send(channel, data);
  };

  autoUpdater.on('checking-for-update', () => send('updater:checking'));
  autoUpdater.on('update-available', (info) => send('updater:available', info));
  autoUpdater.on('update-not-available', () => send('updater:not-available'));
  autoUpdater.on('error', (err) => send('updater:error', err.message));
  autoUpdater.on('download-progress', (progress) => send('updater:progress', progress));
  autoUpdater.on('update-downloaded', (info) => send('updater:downloaded', info));

  // IPC handlers from renderer
  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates());
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate());
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
