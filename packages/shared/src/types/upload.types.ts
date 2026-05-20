export enum UploadSessionStatus {
  CREATED = 'CREATED',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export interface PresignedFileRequest {
  relativePath: string;
  size: number;
  sha256: string;
  contentType: string;
}

export interface PresignedFileResponse {
  relativePath: string;
  uploadUrl: string;
  r2Key: string;
  expiresAt: string;
}
