import type { Processor } from 'bullmq';
import mongoose, { Schema, model } from 'mongoose';
import { R2Client } from '@gamehub/r2-client';
import { GameStatus } from '@gamehub/shared';

export const DELETE_GAME_R2_QUEUE = 'delete-game-r2';

// Minimal schema reference — mirrors the main API schema
const GameModel =
  mongoose.models['Game'] ??
  model(
    'Game',
    new Schema(
      { status: String, deletedAt: Date },
      { collection: 'games', timestamps: true },
    ),
  );

export const deleteGameR2Processor: Processor<{ gameId: string }> = async (job) => {
  const { gameId } = job.data;
  job.log(`Deleting R2 objects for game ${gameId}`);

  const r2 = new R2Client({
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? '',
  });

  const prefix = `games/${gameId}/`;
  await r2.deletePrefix(prefix);
  job.log(`Deleted all objects under ${prefix}`);

  await GameModel.findByIdAndUpdate(gameId, {
    status: GameStatus.DELETED,
    deletedAt: new Date(),
  });
  job.log(`Game ${gameId} marked as DELETED`);
};
