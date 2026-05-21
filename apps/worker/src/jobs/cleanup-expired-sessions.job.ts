import type { Processor } from 'bullmq';
import mongoose, { Schema, model } from 'mongoose';
import { UploadSessionStatus } from '@gamehub/shared';

export const CLEANUP_EXPIRED_SESSIONS_QUEUE = 'cleanup-expired-sessions';

const UploadSessionModel =
  mongoose.models['UploadSession'] ??
  model(
    'UploadSession',
    new Schema(
      {
        status: String,
        expiresAt: Date,
        patchVersionId: String,
      },
      { collection: 'uploadsessions', timestamps: true },
    ),
  );

/**
 * Cleanup expired upload sessions job
 * Runs periodically (can be triggered via cron or manually enqueued)
 * Finds all sessions that expired and marks them as EXPIRED if not completed
 */
export const cleanupExpiredSessionsProcessor: Processor<{}> = async (job) => {
  job.log('Cleaning up expired upload sessions');

  const now = new Date();

  // Find all sessions that expired but aren't marked as expired yet
  const expiredSessions = await UploadSessionModel.find({
    expiresAt: { $lt: now },
    status: { $nin: [UploadSessionStatus.COMPLETED, UploadSessionStatus.EXPIRED] },
  });

  job.log(`Found ${expiredSessions.length} expired sessions`);

  if (expiredSessions.length === 0) {
    job.log('No expired sessions to clean up');
    return;
  }

  // Mark all as EXPIRED
  const result = await UploadSessionModel.updateMany(
    {
      expiresAt: { $lt: now },
      status: { $nin: [UploadSessionStatus.COMPLETED, UploadSessionStatus.EXPIRED] },
    },
    { $set: { status: UploadSessionStatus.EXPIRED } },
  );

  job.log(`Updated ${result.modifiedCount} sessions to EXPIRED`);

  // Optional: Delete incomplete R2 files if we had the R2 service here
  // For now, we just mark the sessions as expired
  // The admin can manually clean up incomplete uploads or use a different process

  job.log('Cleanup complete');
};
