export interface R2ClientConfig {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
}

export interface PresignPutOptions {
  key: string;
  contentType: string;
  /** Seconds until URL expires. Default: 3600 */
  expiresIn?: number;
}

export interface PresignGetOptions {
  key: string;
  /** Seconds until URL expires. Default: 3600 */
  expiresIn?: number;
}

export interface ListObjectsOptions {
  prefix: string;
}

export interface R2Object {
  key: string;
  size: number;
  etag?: string;
}
