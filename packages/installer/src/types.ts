import type { PatchManifest } from '@gamehub/shared';

export interface InstallOptions {
  manifest: PatchManifest;
  gamePath: string;
  cacheDir: string;
  backupDir: string;
  onProgress?: (progress: InstallProgress) => void;
}

export type InstallPhase =
  | 'downloading'
  | 'verifying'
  | 'backing_up'
  | 'installing'
  | 'done';

export interface InstallProgress {
  phase: InstallPhase;
  current: number;
  total: number;
  currentFile: string;
  bytesDownloaded: number;
  totalBytes: number;
  percent: number;
}

export interface InstalledFile {
  relativePath: string;
  sha256: string;
  installedPath: string;
}

export interface InstallReceipt {
  gameId: string;
  gameSlug: string;
  installedPatchVersionId: string;
  installedVersion: string;
  gamePath: string;
  installedAt: string;
  files: InstalledFile[];
}
