export enum PatchStatus {
  DRAFT = 'DRAFT',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
  REPLACED = 'REPLACED',
}

export enum PatchMode {
  NEW_VERSION = 'NEW_VERSION',
  REPLACE_EXISTING = 'REPLACE_EXISTING',
}

export interface PatchFileEntry {
  relativePath: string;
  url: string;
  r2Key: string;
  size: number;
  sha256: string;
  overwrite: boolean;
}

export interface PatchManifest {
  schemaVersion: 1;
  gameId: string;
  gameSlug: string;
  patchVersionId: string;
  version: string;
  mode: PatchMode;
  title: string;
  changelog: string;
  totalSize: number;
  fileCount: number;
  createdAt: string;
  publishedAt: string;
  files: PatchFileEntry[];
  install: {
    strategy: 'COPY_OVERWRITE';
    requiresBackup: boolean;
  };
}

export interface PatchVersion {
  _id: string;
  gameId: string;
  version: string;
  title: string;
  changelog: string;
  status: PatchStatus;
  mode: PatchMode;
  r2Prefix: string;
  manifestKey?: string | null;
  totalSize?: number | null;
  fileCount?: number | null;
  publishedAt?: string | null;
  replacedPatchVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
}
