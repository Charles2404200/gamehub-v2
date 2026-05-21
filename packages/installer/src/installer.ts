import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import type { IncomingMessage } from 'http';
import type { InstallOptions, InstallReceipt, InstalledFile } from './types';

/**
 * Validates that a relative path does not escape its parent directory.
 * Throws on absolute paths or path traversal attempts.
 */
function assertSafeRelativePath(relativePath: string): void {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed: "${relativePath}"`);
  }
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith('..')) {
    throw new Error(`Path traversal detected: "${relativePath}"`);
  }
}

/**
 * Ensures the resolved destination is strictly within the allowed base directory.
 */
function assertWithinBase(resolvedPath: string, resolvedBase: string): void {
  const base = resolvedBase.endsWith(path.sep) ? resolvedBase : resolvedBase + path.sep;
  if (!resolvedPath.startsWith(base) && resolvedPath !== resolvedBase) {
    throw new Error(`Resolved path "${resolvedPath}" escapes base "${resolvedBase}"`);
  }
}

/**
 * Downloads a URL to a local file path (follows up to 5 redirects).
 * Returns the SHA-256 hex digest of the downloaded content.
 */
async function downloadFile(
  url: string,
  destPath: string,
  onBytes?: (bytes: number) => void,
  redirectsLeft = 5,
): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const client = url.startsWith('https://') ? https : http;

    client
      .get(url, (response: IncomingMessage) => {
        // Follow redirects (301/302/307/308)
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          if (redirectsLeft <= 0) {
            reject(new Error(`Too many redirects downloading "${url}"`));
            return;
          }
          response.resume();
          resolve(downloadFile(response.headers.location, destPath, onBytes, redirectsLeft - 1));
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode ?? 'unknown'} downloading "${url}"`));
          return;
        }

        const file = fs.createWriteStream(destPath);
        const hash = crypto.createHash('sha256');

        response.on('data', (chunk: Buffer) => {
          hash.update(chunk);
          onBytes?.(chunk.length);
        });
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(hash.digest('hex')));
        });
        file.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      })
      .on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}

/** Compute the SHA-256 hex digest of a local file. */
async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Installs a patch into the target game directory.
 *
 * Phases:
 *  1. Download all files to a local cache directory.
 *  2. Verify SHA-256 checksums.
 *  3. Backup existing files (when requiresBackup = true).
 *  4. Copy files into the game directory, overwriting as needed.
 *
 * This function is designed to run inside the Electron main process only.
 * The renderer communicates via IPC — never expose filesystem operations directly to the renderer.
 */
export async function installPatch(options: InstallOptions): Promise<InstallReceipt> {
  const { manifest, gamePath, cacheDir, backupDir, onProgress } = options;

  const totalFiles = manifest.files.length;
  const totalBytes = manifest.totalSize;
  let bytesDownloaded = 0;

  const resolvedGamePath = path.resolve(gamePath);

  // ── Phase 1 & 2: Download + Verify ──────────────────────────────────────
  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];
    assertSafeRelativePath(file.relativePath);

    const cachePath = path.join(cacheDir, manifest.patchVersionId, file.relativePath);

    onProgress?.({
      phase: 'downloading',
      current: i + 1,
      total: totalFiles,
      currentFile: file.relativePath,
      bytesDownloaded,
      totalBytes,
    });

    const downloadedHash = await downloadFile(file.url, cachePath, (bytes) => {
      bytesDownloaded += bytes;
    });

    if (downloadedHash !== file.sha256) {
      throw new Error(
        `Checksum mismatch for "${file.relativePath}". ` +
          `Expected: ${file.sha256}, Got: ${downloadedHash}`,
      );
    }

    onProgress?.({
      phase: 'verifying',
      current: i + 1,
      total: totalFiles,
      currentFile: file.relativePath,
      bytesDownloaded,
      totalBytes,
    });
  }

  // ── Phase 3: Backup existing files ──────────────────────────────────────
  if (manifest.install.requiresBackup) {
    for (let i = 0; i < manifest.files.length; i++) {
      const file = manifest.files[i];
      const targetPath = path.join(resolvedGamePath, file.relativePath);

      if (fs.existsSync(targetPath)) {
        const backupPath = path.join(backupDir, manifest.patchVersionId, file.relativePath);
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.copyFileSync(targetPath, backupPath);
      }

      onProgress?.({
        phase: 'backing_up',
        current: i + 1,
        total: totalFiles,
        currentFile: file.relativePath,
        bytesDownloaded,
        totalBytes,
      });
    }
  }

  // ── Phase 4: Install files into game directory ───────────────────────────
  const installedFiles: InstalledFile[] = [];

  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];
    assertSafeRelativePath(file.relativePath);

    const cachePath = path.join(cacheDir, manifest.patchVersionId, file.relativePath);
    const targetPath = path.resolve(resolvedGamePath, file.relativePath);

    // Second safety check: ensure target stays inside game folder
    assertWithinBase(targetPath, resolvedGamePath);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(cachePath, targetPath);

    const installedHash = await hashFile(targetPath);
    installedFiles.push({
      relativePath: file.relativePath,
      sha256: installedHash,
      installedPath: targetPath,
    });

    onProgress?.({
      phase: 'installing',
      current: i + 1,
      total: totalFiles,
      currentFile: file.relativePath,
      bytesDownloaded,
      totalBytes,
    });
  }

  onProgress?.({
    phase: 'done',
    current: totalFiles,
    total: totalFiles,
    currentFile: '',
    bytesDownloaded,
    totalBytes,
  });

  return {
    gameId: manifest.gameId,
    gameSlug: manifest.gameSlug,
    installedPatchVersionId: manifest.patchVersionId,
    installedVersion: manifest.version,
    gamePath: resolvedGamePath,
    installedAt: new Date().toISOString(),
    files: installedFiles,
  };
}
