import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R2Client } from '@gamehub/r2-client';

@Injectable()
export class R2Service {
  private readonly client: R2Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new R2Client({
      accountId: configService.getOrThrow('R2_ACCOUNT_ID'),
      bucket: configService.getOrThrow('R2_BUCKET'),
      accessKeyId: configService.getOrThrow('R2_ACCESS_KEY_ID'),
      secretAccessKey: configService.getOrThrow('R2_SECRET_ACCESS_KEY'),
      publicBaseUrl: configService.getOrThrow('R2_PUBLIC_BASE_URL'),
    });
  }

  // ============ LOW-LEVEL OPERATIONS ============

  presignPut(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    return this.client.presignPut({ key, contentType, expiresIn });
  }

  presignGet(key: string, expiresIn = 3600): Promise<string> {
    return this.client.presignGet({ key, expiresIn });
  }

  getPublicUrl(key: string): string {
    return this.client.getPublicUrl(key);
  }

  deletePrefix(prefix: string): Promise<number> {
    return this.client.deletePrefix(prefix);
  }

  deleteObjects(keys: string[]): Promise<void> {
    return this.client.deleteObjects(keys);
  }

  objectExists(key: string): Promise<boolean> {
    return this.client.objectExists(key);
  }

  // ============ KEY GENERATION HELPERS ============

  /** Generate key for game cover image */
  getGameCoverKey(gameId: string): string {
    return `games/${gameId}/cover/cover.webp`;
  }

  /** Generate key for game banner image */
  getGameBannerKey(gameId: string): string {
    return `games/${gameId}/banner/banner.webp`;
  }

  /** Generate base prefix for all files of a game */
  getGamePrefix(gameId: string): string {
    return `games/${gameId}/`;
  }

  /** Generate prefix for patch version */
  getPatchVersionPrefix(gameId: string, patchVersionId: string): string {
    return `games/${gameId}/versions/${patchVersionId}/`;
  }

  /** Generate key for a patch file */
  getPatchFileKey(gameId: string, patchVersionId: string, relativePath: string): string {
    return `${this.getPatchVersionPrefix(gameId, patchVersionId)}files/${relativePath}`;
  }

  /** Generate key for patch manifest.json */
  getPatchManifestKey(gameId: string, patchVersionId: string): string {
    return `${this.getPatchVersionPrefix(gameId, patchVersionId)}manifest.json`;
  }

  /** Generate base prefix for launcher updates */
  getLauncherUpdatesPrefix(platform: string): string {
    return `launcher-updates/${platform}/`;
  }

  /** Generate key for latest.yml (or latest-mac.yml, latest-linux.yml) */
  getLauncherLatestConfigKey(platform: string): string {
    const config: Record<string, string> = {
      win32: 'launcher-updates/win/latest.yml',
      darwin: 'launcher-updates/mac/latest-mac.yml',
      linux: 'launcher-updates/linux/latest-linux.yml',
    };
    return config[platform] || 'launcher-updates/win/latest.yml';
  }

  /** Generate key for launcher executable/installer */
  getLauncherArtifactKey(platform: string, version: string): string {
    const artifacts: Record<string, string> = {
      win32: `launcher-updates/win/GameHub-Setup-${version}.exe`,
      darwin: `launcher-updates/mac/GameHub-${version}.dmg`,
      linux: `launcher-updates/linux/GameHub-${version}.AppImage`,
    };
    return artifacts[platform] || `launcher-updates/win/GameHub-Setup-${version}.exe`;
  }

  /** Generate key for launcher artifact blockmap (Windows only) */
  getLauncherBlockmapKey(version: string): string {
    return `launcher-updates/win/GameHub-Setup-${version}.exe.blockmap`;
  }

  // ============ STORAGE OPERATIONS ============

  /** Delete all objects for a game (covers, banners, patches, manifests) */
  async deleteGameObjects(gameId: string): Promise<number> {
    return this.deletePrefix(this.getGamePrefix(gameId));
  }

  /** Delete all objects for a patch version */
  async deletePatchVersionObjects(gameId: string, patchVersionId: string): Promise<number> {
    return this.deletePrefix(this.getPatchVersionPrefix(gameId, patchVersionId));
  }

  /** Delete launcher artifacts for a specific version */
  async deleteLauncherVersion(platform: string, version: string): Promise<void> {
    const keys = [
      this.getLauncherLatestConfigKey(platform),
      this.getLauncherArtifactKey(platform, version),
    ];

    // Only Windows has blockmap
    if (platform === 'win32') {
      keys.push(this.getLauncherBlockmapKey(version));
    }

    await this.deleteObjects(keys);
  }
}
