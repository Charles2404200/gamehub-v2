import { IpcMain, BrowserWindow } from 'electron';
import type { AppUpdater } from 'electron-updater';
import type { UpdateCheckResult, UpdateInfo } from 'electron-updater';

interface SerializedUpdaterError {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
}

function serializeUpdaterError(err: unknown): SerializedUpdaterError {
  if (err instanceof Error) {
    const withCode = err as Error & { code?: string };
    return {
      message: err.message,
      name: err.name,
      code: withCode.code,
      stack: err.stack,
    };
  }

  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    return {
      message: typeof record.message === 'string' ? record.message : String(err),
      name: typeof record.name === 'string' ? record.name : undefined,
      code: typeof record.code === 'string' ? record.code : undefined,
      stack: typeof record.stack === 'string' ? record.stack : undefined,
    };
  }

  return { message: String(err) };
}

function serializeUpdateInfo(updateInfo: UpdateInfo | null | undefined) {
  if (!updateInfo) return null;
  return {
    version: updateInfo.version,
    releaseDate: updateInfo.releaseDate,
    files: updateInfo.files,
  };
}

function serializeCheckResult(result: UpdateCheckResult | null) {
  if (!result) return null;
  return {
    isUpdateAvailable: result.isUpdateAvailable,
    updateInfo: serializeUpdateInfo(result.updateInfo),
    hasDownloadPromise: Boolean(result.downloadPromise),
  };
}

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

  const emitUpdaterError = (source: string, action: string | null, err: unknown) => {
    send('updater:error', {
      source,
      action,
      at: new Date().toISOString(),
      ...serializeUpdaterError(err),
    });
  };

  autoUpdater.on('checking-for-update', () => send('updater:checking'));
  autoUpdater.on('update-available', (info) => send('updater:available', serializeUpdateInfo(info)));
  autoUpdater.on('update-not-available', (info) =>
    send('updater:not-available', serializeUpdateInfo(info)),
  );
  autoUpdater.on('error', (err) => emitUpdaterError('updater:event', null, err));
  autoUpdater.on('download-progress', (progress) => send('updater:progress', progress));
  autoUpdater.on('update-downloaded', (info) => send('updater:downloaded', info));

  // IPC handlers from renderer
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return serializeCheckResult(result);
    } catch (err) {
      emitUpdaterError('updater:ipc', 'check', err);
      throw err;
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      return await autoUpdater.downloadUpdate();
    } catch (err) {
      emitUpdaterError('updater:ipc', 'download', err);
      throw err;
    }
  });

  ipcMain.handle('updater:install', async () => {
    try {
      autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    } catch (err) {
      emitUpdaterError('updater:ipc', 'install', err);
      throw err;
    }
  });
}
