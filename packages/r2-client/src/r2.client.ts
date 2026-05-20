import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  R2ClientConfig,
  PresignPutOptions,
  PresignGetOptions,
  ListObjectsOptions,
  R2Object,
} from './r2.types';

export class R2Client {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: R2ClientConfig) {
    this.bucket = config.bucket;
    this.publicBaseUrl = config.publicBaseUrl.replace(/\/$/, '');
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /** Generate a presigned URL for uploading (PUT) an object to R2. */
  async presignPut(options: PresignPutOptions): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      ContentType: options.contentType,
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: options.expiresIn ?? 3600,
    });
  }

  /** Generate a presigned URL for downloading (GET) an object from R2. */
  async presignGet(options: PresignGetOptions): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: options.expiresIn ?? 3600,
    });
  }

  /** Construct the public CDN URL for an object key. */
  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  /** List all objects under a given prefix (handles pagination). */
  async listObjects(options: ListObjectsOptions): Promise<R2Object[]> {
    const objects: R2Object[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: options.prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });
      const response = await this.s3.send(command);

      for (const obj of response.Contents ?? []) {
        if (obj.Key) {
          objects.push({ key: obj.Key, size: obj.Size ?? 0, etag: obj.ETag });
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  /** Delete a list of object keys in batches of 1000. */
  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const batchSize = 1000;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await this.s3.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: batch.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );
    }
  }

  /** Delete all objects under a prefix. Returns number of deleted objects. */
  async deletePrefix(prefix: string): Promise<number> {
    const objects = await this.listObjects({ prefix });
    if (objects.length === 0) return 0;
    await this.deleteObjects(objects.map((o) => o.key));
    return objects.length;
  }

  /** Check whether an object exists. */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
