/**
 * R2 Storage constants and utilities
 * Defines key prefixes, patterns, and helper functions for R2 operations
 */

export const R2_PATHS = {
  // Game images
  GAME_COVER: (gameId: string) => `games/${gameId}/cover/cover.webp`,
  GAME_BANNER: (gameId: string) => `games/${gameId}/banner/banner.webp`,
  GAME_PREFIX: (gameId: string) => `games/${gameId}/`,

  // Patch files
  PATCH_PREFIX: (gameId: string, patchVersionId: string) =>
    `games/${gameId}/versions/${patchVersionId}/`,
  PATCH_FILES_PREFIX: (gameId: string, patchVersionId: string) =>
    `games/${gameId}/versions/${patchVersionId}/files/`,
  PATCH_FILE: (gameId: string, patchVersionId: string, relativePath: string) =>
    `games/${gameId}/versions/${patchVersionId}/files/${relativePath}`,
  PATCH_MANIFEST: (gameId: string, patchVersionId: string) =>
    `games/${gameId}/versions/${patchVersionId}/manifest.json`,

  // Launcher updates
  LAUNCHER_UPDATES_PREFIX: (platform: string) => `launcher-updates/${platform}/`,
  LAUNCHER_LATEST_WIN: () => `launcher-updates/win/latest.yml`,
  LAUNCHER_LATEST_MAC: () => `launcher-updates/mac/latest-mac.yml`,
  LAUNCHER_LATEST_LINUX: () => `launcher-updates/linux/latest-linux.yml`,
  LAUNCHER_EXE: (version: string) =>
    `launcher-updates/win/GameHub-Setup-${version}.exe`,
  LAUNCHER_DMG: (version: string) =>
    `launcher-updates/mac/GameHub-${version}.dmg`,
  LAUNCHER_APPIMAGE: (version: string) =>
    `launcher-updates/linux/GameHub-${version}.AppImage`,
  LAUNCHER_BLOCKMAP: (version: string) =>
    `launcher-updates/win/GameHub-Setup-${version}.exe.blockmap`,
};

/**
 * Get launcher latest config key by platform
 */
export function getLauncherLatestKey(platform: 'win32' | 'darwin' | 'linux'): string {
  const map = {
    win32: R2_PATHS.LAUNCHER_LATEST_WIN(),
    darwin: R2_PATHS.LAUNCHER_LATEST_MAC(),
    linux: R2_PATHS.LAUNCHER_LATEST_LINUX(),
  };
  return map[platform];
}

/**
 * Get launcher artifact key by platform
 */
export function getLauncherArtifactKey(
  platform: 'win32' | 'darwin' | 'linux',
  version: string,
): string {
  const map = {
    win32: R2_PATHS.LAUNCHER_EXE(version),
    darwin: R2_PATHS.LAUNCHER_DMG(version),
    linux: R2_PATHS.LAUNCHER_APPIMAGE(version),
  };
  return map[platform];
}

/**
 * Validate that a relative path is safe (no path traversal)
 */
export function isSafeRelativePath(relativePath: string): boolean {
  // Disallow absolute paths
  if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
    return false;
  }

  // Disallow path traversal
  if (relativePath.includes('..') || relativePath.includes('~')) {
    return false;
  }

  // Disallow drive letters (Windows)
  if (/^[a-zA-Z]:/.test(relativePath)) {
    return false;
  }

  return true;
}

/**
 * Presigned URL expiration times
 */
export const PRESIGNED_EXPIRY = {
  SHORT: 600, // 10 minutes for image uploads
  MEDIUM: 3600, // 1 hour for patch files
  LONG: 7200, // 2 hours for launcher artifacts
  MAX: 43200, // 12 hours max allowed by S3
};

/**
 * R2 Content types
 */
export const CONTENT_TYPES = {
  // Images
  WEBP: 'image/webp',
  PNG: 'image/png',
  JPEG: 'image/jpeg',

  // Archives/Executables
  ZIP: 'application/zip',
  EXE: 'application/x-msdownload',
  DMG: 'application/x-apple-diskimage',
  APPIMAGE: 'application/x-executable',

  // Data
  JSON: 'application/json',
  YAML: 'application/yaml',
  PAK: 'application/octet-stream',
  BIN: 'application/octet-stream',

  // Fallback
  OCTET: 'application/octet-stream',
};

/**
 * Get content type from file extension
 */
export function getContentTypeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';

  const map: Record<string, string> = {
    webp: CONTENT_TYPES.WEBP,
    png: CONTENT_TYPES.PNG,
    jpg: CONTENT_TYPES.JPEG,
    jpeg: CONTENT_TYPES.JPEG,
    zip: CONTENT_TYPES.ZIP,
    exe: CONTENT_TYPES.EXE,
    dmg: CONTENT_TYPES.DMG,
    appimage: CONTENT_TYPES.APPIMAGE,
    json: CONTENT_TYPES.JSON,
    yaml: CONTENT_TYPES.YAML,
    yml: CONTENT_TYPES.YAML,
    pak: CONTENT_TYPES.PAK,
    blockmap: CONTENT_TYPES.OCTET,
  };

  return map[ext] || CONTENT_TYPES.OCTET;
}
