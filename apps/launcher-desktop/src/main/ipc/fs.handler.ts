import { IpcMain, dialog, BrowserWindow, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { installPatch } from '@gamehub/installer';
import type { InstallOptions, InstallProgress } from '@gamehub/installer';
import type { PatchManifest } from '@gamehub/shared';

/** Resolve gamehub virtual paths (e.g. "gamehub-cache:slug") to real OS paths */
function resolveVirtualPath(virtualPath: string): string {
  const userData = app.getPath('userData');
  if (virtualPath.startsWith('gamehub-cache:')) {
    return path.join(userData, 'gamehub', 'cache', virtualPath.slice('gamehub-cache:'.length));
  }
  if (virtualPath.startsWith('gamehub-backup:')) {
    return path.join(userData, 'gamehub', 'backups', virtualPath.slice('gamehub-backup:'.length));
  }
  if (virtualPath.startsWith('gamehub-receipt:')) {
    return path.join(userData, 'gamehub', 'receipts', virtualPath.slice('gamehub-receipt:'.length) + '.json');
  }
  return virtualPath;
}

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
    try {
      if (!fs.existsSync(gamePath)) return { valid: false, reason: 'Path does not exist' };

      const files = fs.readdirSync(gamePath);
      const hasExecutable = executableNames.some((name) =>
        files.some((f) => f.toLowerCase() === name.toLowerCase()),
      );

      return { valid: hasExecutable, reason: hasExecutable ? null : 'No matching executable found' };
    } catch (err) {
      return { valid: false, reason: String(err) };
    }
  });

  /** Read a local install receipt (JSON) */
  ipcMain.handle('fs:readInstallReceipt', (_event, receiptPath: string) => {
    try {
      const resolved = resolveVirtualPath(receiptPath);
      if (!fs.existsSync(resolved)) return null;
      return JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    } catch {
      return null;
    }
  });

  /** Write an install receipt to disk */
  ipcMain.handle('fs:writeInstallReceipt', (_event, receiptPath: string, data: unknown) => {
    try {
      const resolved = resolveVirtualPath(receiptPath);
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, JSON.stringify(data, null, 2), 'utf-8');
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
          cacheDir: resolveVirtualPath(options.cacheDir),
          backupDir: resolveVirtualPath(options.backupDir),
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
