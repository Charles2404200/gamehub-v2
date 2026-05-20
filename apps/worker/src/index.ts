import 'dotenv/config';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { deleteGameR2Processor, DELETE_GAME_R2_QUEUE } from './jobs/delete-game-r2.job';
import { deletePatchR2Processor, DELETE_PATCH_R2_QUEUE } from './jobs/delete-patch-r2.job';
import { Worker } from 'bullmq';

const MONGODB_URI = process.env.MONGODB_URI ?? '';
const REDIS_URL = process.env.REDIS_URL ?? '';

if (!MONGODB_URI) {
  console.error('[worker] MONGODB_URI is not set — exiting');
  process.exit(1);
}

if (!REDIS_URL) {
  console.error('[worker] REDIS_URL is not set — exiting');
  process.exit(1);
}

const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('[worker] MongoDB connected');

  const deleteGameWorker = new Worker(DELETE_GAME_R2_QUEUE, deleteGameR2Processor, {
    connection,
    concurrency: 2,
  });

  const deletePatchWorker = new Worker(DELETE_PATCH_R2_QUEUE, deletePatchR2Processor, {
    connection,
    concurrency: 4,
  });

  for (const w of [deleteGameWorker, deletePatchWorker]) {
    w.on('completed', (job) => console.log(`[worker] ${w.name} job ${job.id} completed`));
    w.on('failed', (job, err) =>
      console.error(`[worker] ${w.name} job ${job?.id} failed:`, err.message),
    );
  }

  console.log('[worker] All processors running');

  process.on('SIGTERM', async () => {
    console.log('[worker] SIGTERM received — shutting down');
    await Promise.all([deleteGameWorker.close(), deletePatchWorker.close()]);
    await mongoose.disconnect();
    connection.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[worker] Startup error:', err);
  process.exit(1);
});
