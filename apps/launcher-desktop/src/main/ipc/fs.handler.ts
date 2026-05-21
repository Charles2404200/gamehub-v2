import { IpcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { installPatch } from '@gamehub/installer';
import type { InstallOptions, InstallProgress } from '@gamehub/installer';
import type { PatchManifest } from '@gamehub/shared';

/**
 * All filesystem operations run here in the main process.
 * The renderer communicates via contextBridge IPC — never directly.
 */
export function registerFsHandlers(ipcMain: IpcMain): void {
  /** Open folder picker dialog */
  ipcMain.handle('fs:selectGameFolder', async (_event) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { canceled: true, filePaths: [] };

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Game Folder',
    });

    return result;
  });

  /** Check if a path looks like a valid game install directory */
  ipcMain.handle('fs:validateGamePath', (_event, gamePath: string, executableNames: string[]) => {

  /** Read a local install receipt (JSON) */
  ipcMain.handle('fs:readInstallReceipt', (_event, receiptPath: string) => {
    try {
      if (!fs.existsSync(receiptPath)) return null;
      return JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
    } catch {
      return null;
    }
  });

  /** Write an install receipt to disk */
  ipcMain.handle('fs:writeInstallReceipt', (_event, receiptPath: string, data: unknown) => {
    try {
      fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
      fs.writeFileSync(receiptPath, JSON.stringify(data, null, 2), 'utf-8');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  /**
   * Install a patch. Runs the full download → verify → backup → copy pipeline.
   * Progress events are sent back to renderer via webContents.send.
   */
  ipcMain.handle(
    'fs:installPatch',
    async (
      event,
      options: { manifest: PatchManifest; gamePath: string; cacheDir: string; backupDir: string },
    ) => {
      // Security: validate gamePath is not obviously malicious
      const resolved = path.resolve(options.gamePath);
      if (!resolved || resolved === path.parse(resolved).root) {
        return { ok: false, error: 'Invalid game path' };
      }

      try {
        const result = await installPatch({
          ...options,
          onProgress: (progress: InstallProgress) => {
            event.sender.send('install:progress', progress);
          },
        });
        return { ok: true, receipt: result };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },
  );
}
