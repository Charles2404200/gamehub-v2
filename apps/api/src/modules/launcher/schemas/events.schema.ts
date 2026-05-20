import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DownloadEventDocument = DownloadEvent & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class DownloadEvent {
  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PatchVersion', required: true })
  patchVersionId!: Types.ObjectId;

  @Prop({ type: String, default: null })
  launcherVersion!: string | null;

  /** Hashed IP for privacy */
  @Prop({ type: String, default: null })
  ipHash!: string | null;
}

export const DownloadEventSchema = SchemaFactory.createForClass(DownloadEvent);
DownloadEventSchema.index({ gameId: 1, createdAt: -1 });

export type InstallReportDocument = InstallReport & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class InstallReport {
  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PatchVersion', required: true })
  patchVersionId!: Types.ObjectId;

  @Prop({ type: String, default: null })
  launcherVersion!: string | null;

  @Prop({ type: String, enum: ['SUCCESS', 'FAILED'], required: true })
  status!: 'SUCCESS' | 'FAILED';

  @Prop({ type: String, default: null })
  errorMessage!: string | null;
}

export const InstallReportSchema = SchemaFactory.createForClass(InstallReport);
InstallReportSchema.index({ gameId: 1, patchVersionId: 1, createdAt: -1 });
