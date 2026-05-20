export interface LauncherConfig {
  latestVersion: string;
  minSupportedVersion: string;
  forceUpdate: boolean;
  updateBaseUrl: string;
}

export enum LauncherPlatform {
  WIN32 = 'win32',
  DARWIN = 'darwin',
  LINUX = 'linux',
}

export enum LauncherReleaseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export interface LauncherRelease {
  _id: string;
  version: string;
  platform: LauncherPlatform;
  status: LauncherReleaseStatus;
  forceUpdate: boolean;
  minSupportedVersion: string;
  releaseNotes: string;
  updateBaseUrl: string;
  artifactKeys: string[];
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
