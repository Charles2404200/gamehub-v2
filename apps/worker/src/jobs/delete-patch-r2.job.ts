import type { Processor } from 'bullmq';
import mongoose, { Schema, model } from 'mongoose';
import { R2Client } from '@gamehub/r2-client';
import { PatchStatus } from '@gamehub/shared';

export const DELETE_PATCH_R2_QUEUE = 'delete-patch-r2';

const PatchVersionModel =
  mongoose.models['PatchVersion'] ??
  model(
    'PatchVersion',
    new Schema(
      { status: String, r2Prefix: String },
      { collection: 'patchversions', timestamps: true },
    ),
  );

export const deletePatchR2Processor: Processor<{ patchVersionId: string }> = async (job) => {
  const { patchVersionId } = job.data;
  job.log(`Deleting R2 objects for patch ${patchVersionId}`);

  const patch = await PatchVersionModel.findById(patchVersionId).lean();
  if (!patch) {
    job.log(`Patch ${patchVersionId} not found — skipping`);
    return;
  }

  const r2 = new R2Client({
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? '',
  });

  const patchDoc = patch as unknown as { r2Prefix?: string };
  if (patchDoc.r2Prefix) {
    await r2.deletePrefix(patchDoc.r2Prefix);
    job.log(`Deleted R2 objects under ${patchDoc.r2Prefix}`);
  }

  await PatchVersionModel.findByIdAndUpdate(patchVersionId, { status: PatchStatus.ARCHIVED });
  job.log(`Patch ${patchVersionId} marked ARCHIVED`);
};
