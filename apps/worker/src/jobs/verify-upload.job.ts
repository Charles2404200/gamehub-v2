import type { Processor } from 'bullmq';
import mongoose, { Schema, model, Types } from 'mongoose';
import { PatchStatus } from '@gamehub/shared';

export const VERIFY_UPLOAD_QUEUE = 'verify-upload';

const PatchVersionModel =
  mongoose.models['PatchVersion'] ??
  model(
    'PatchVersion',
    new Schema(
      {
        status: String,
        manifestKey: String,
        fileCount: Number,
      },
      { collection: 'patchversions', timestamps: true },
    ),
  );

const PatchFileModel =
  mongoose.models['PatchFile'] ??
  model(
    'PatchFile',
    new Schema(
      {
        patchVersionId: Types.ObjectId,
        r2Key: String,
        sha256: String,
      },
      { collection: 'patchfiles', timestamps: true },
    ),
  );

/**
 * Verify upload job — checks if all patch files are uploaded and metadata is complete
 * If successful, marks patch as PUBLISHED (or PROCESSING if needs manifest generation)
 */
export const verifyUploadProcessor: Processor<{ patchVersionId: string }> = async (job) => {
  const { patchVersionId } = job.data;
  job.log(`Verifying upload for patch ${patchVersionId}`);

  const patch = await PatchVersionModel.findById(patchVersionId).lean();
  if (!patch) {
    job.log(`Patch ${patchVersionId} not found — skipping`);
    return;
  }

  const patchDoc = patch as unknown as { fileCount?: number; manifestKey?: string };

  // Count uploaded files in database
  const uploadedFileCount = await PatchFileModel.countDocuments({
    patchVersionId: new Types.ObjectId(patchVersionId),
  });

  job.log(`Expected: ${patchDoc.fileCount}, Uploaded: ${uploadedFileCount}`);

  if (uploadedFileCount !== patchDoc.fileCount) {
    job.log(`File count mismatch — marking as FAILED`);
    await PatchVersionModel.findByIdAndUpdate(patchVersionId, {
      status: PatchStatus.FAILED,
    });
    throw new Error(`File count mismatch: expected ${patchDoc.fileCount}, got ${uploadedFileCount}`);
  }

  // Check if manifest exists
  if (!patchDoc.manifestKey) {
    job.log(`No manifest key — keeping status as PROCESSING`);
    await PatchVersionModel.findByIdAndUpdate(patchVersionId, {
      status: PatchStatus.PROCESSING,
    });
    return;
  }

  job.log(`All files verified — marking as PUBLISHED-ready`);
  // In a real scenario, manifest generation would happen here or by another worker
  // For now, just mark as PROCESSING (awaiting publish call from admin)
  await PatchVersionModel.findByIdAndUpdate(patchVersionId, {
    status: PatchStatus.PROCESSING,
  });

  job.log(`Patch ${patchVersionId} verification complete`);
};
