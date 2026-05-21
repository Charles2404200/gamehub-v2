import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export const DELETE_GAME_R2_QUEUE = 'delete-game-r2';
export const DELETE_PATCH_R2_QUEUE = 'delete-patch-r2';
export const VERIFY_UPLOAD_QUEUE = 'verify-upload';
export const CLEANUP_EXPIRED_SESSIONS_QUEUE = 'cleanup-expired-sessions';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly redisUrl: string;
  private redis: Redis | null = null;

  private deleteGameQueue: Queue<{ gameId: string }> | null = null;
  private deletePatchQueue: Queue<{ patchVersionId: string }> | null = null;
  private verifyUploadQueue: Queue<{ patchVersionId: string }> | null = null;
  private cleanupSessionsQueue: Queue<{}> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = configService.get<string>('REDIS_URL') ?? '';
  }

  /**
   * Initialize queue connections
   * Called by QueueModule during bootstrap
   */
  async init(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'REDIS_URL not set — queue jobs will NOT be processed. Only local/sync operations available.',
      );
      return;
    }

    try {
      this.redis = new Redis(this.redisUrl, { maxRetriesPerRequest: null });

      this.deleteGameQueue = new Queue(DELETE_GAME_R2_QUEUE, { connection: this.redis });
      this.deletePatchQueue = new Queue(DELETE_PATCH_R2_QUEUE, { connection: this.redis });
      this.verifyUploadQueue = new Queue(VERIFY_UPLOAD_QUEUE, { connection: this.redis });
      this.cleanupSessionsQueue = new Queue(CLEANUP_EXPIRED_SESSIONS_QUEUE, {
        connection: this.redis,
      });

      this.logger.log('Queue service initialized');
    } catch (err) {
      this.logger.error('Failed to initialize queues:', err);
      throw err;
    }
  }

  /**
   * Enqueue job to delete game R2 objects
   */
  async enqueueDeleteGame(gameId: string): Promise<void> {
    if (!this.deleteGameQueue) {
      this.logger.warn('Queue not initialized — skipping enqueue');
      return;
    }

    await this.deleteGameQueue.add('delete-game', { gameId }, { removeOnComplete: true });
    this.logger.log(`Enqueued delete-game job for gameId=${gameId}`);
  }

  /**
   * Enqueue job to delete patch R2 objects
   */
  async enqueueDeletePatch(patchVersionId: string): Promise<void> {
    if (!this.deletePatchQueue) {
      this.logger.warn('Queue not initialized — skipping enqueue');
      return;
    }

    await this.deletePatchQueue.add('delete-patch', { patchVersionId }, { removeOnComplete: true });
    this.logger.log(`Enqueued delete-patch job for patchVersionId=${patchVersionId}`);
  }

  /**
   * Enqueue job to verify patch upload completion
   */
  async enqueueVerifyUpload(patchVersionId: string): Promise<void> {
    if (!this.verifyUploadQueue) {
      this.logger.warn('Queue not initialized — skipping enqueue');
      return;
    }

    await this.verifyUploadQueue.add(
      'verify-upload',
      { patchVersionId },
      { removeOnComplete: true },
    );
    this.logger.log(`Enqueued verify-upload job for patchVersionId=${patchVersionId}`);
  }

  /**
   * Enqueue job to cleanup expired upload sessions
   */
  async enqueueCleanupSessions(): Promise<void> {
    if (!this.cleanupSessionsQueue) {
      this.logger.warn('Queue not initialized — skipping enqueue');
      return;
    }

    await this.cleanupSessionsQueue.add('cleanup-sessions', {}, { removeOnComplete: true });
    this.logger.log('Enqueued cleanup-sessions job');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.deleteGameQueue) await this.deleteGameQueue.close();
    if (this.deletePatchQueue) await this.deletePatchQueue.close();
    if (this.verifyUploadQueue) await this.verifyUploadQueue.close();
    if (this.cleanupSessionsQueue) await this.cleanupSessionsQueue.close();
    if (this.redis) this.redis.disconnect();
    this.logger.log('Queue service shut down');
  }
}
