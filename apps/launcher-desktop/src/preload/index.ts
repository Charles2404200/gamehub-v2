import { contextBridge, ipcRenderer } from 'electron';
import type { PatchManifest } from '@gamehub/shared';

/**
 * All APIs exposed to the renderer.
 * The renderer NEVER gets direct access to Node.js or Electron internals.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // Filesystem (runs in main process only)
  fs: {
    validateGamePath: (gamePath: string, executableNames: string[]) =>
      ipcRenderer.invoke('fs:validateGamePath', gamePath, executableNames),
    readInstallReceipt: (receiptPath: string) =>
      ipcRenderer.invoke('fs:readInstallReceipt', receiptPath),
    writeInstallReceipt: (receiptPath: string, data: unknown) =>
      ipcRenderer.invoke('fs:writeInstallReceipt', receiptPath, data),
    installPatch: (options: {
      manifest: PatchManifest;
      gamePath: string;
      cacheDir: string;
      backupDir: string;
    }) => ipcRenderer.invoke('fs:installPatch', options),
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onChecking: (cb: () => void) => ipcRenderer.on('updater:checking', cb),
    onAvailable: (cb: (info: unknown) => void) =>
      ipcRenderer.on('updater:available', (_e, info) => cb(info)),
    onNotAvailable: (cb: () => void) => ipcRenderer.on('updater:not-available', cb),
    onProgress: (cb: (progress: unknown) => void) =>
      ipcRenderer.on('updater:progress', (_e, p) => cb(p)),
    onDownloaded: (cb: (info: unknown) => void) =>
      ipcRenderer.on('updater:downloaded', (_e, info) => cb(info)),
    onError: (cb: (msg: string) => void) =>
      ipcRenderer.on('updater:error', (_e, msg) => cb(msg)),
  },

  // Install progress listener
  onInstallProgress: (cb: (progress: unknown) => void) =>
    ipcRenderer.on('install:progress', (_e, p) => cb(p)),
});
