import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { LauncherPlatform, LauncherReleaseStatus } from '@gamehub/shared';

export type LauncherReleaseDocument = HydratedDocument<LauncherRelease>;

@Schema({ timestamps: true })
export class LauncherRelease {
  @Prop({ type: String, required: true, index: true })
  version!: string;

  @Prop({ type: String, required: true, enum: LauncherPlatform, index: true })
  platform!: LauncherPlatform;

  @Prop({ type: String, required: true, enum: LauncherReleaseStatus, default: LauncherReleaseStatus.DRAFT })
  status!: LauncherReleaseStatus;

  @Prop({ type: Boolean, required: true, default: false })
  forceUpdate!: boolean;

  @Prop({ type: String, required: true })
  minSupportedVersion!: string;

  @Prop({ type: String, required: true, default: '' })
  releaseNotes!: string;

  @Prop({ type: String, required: true })
  updateBaseUrl!: string;

  @Prop({ required: true, type: [String], default: [] })
  artifactKeys!: string[];

  @Prop({ type: Date, nullable: true })
  publishedAt?: Date | null;

  @Prop({ type: Date, index: true })
  createdAt?: Date;

  @Prop({ type: Date, index: true })
  updatedAt?: Date;
}

export const LauncherReleaseSchema = SchemaFactory.createForClass(LauncherRelease);

// Indexes
LauncherReleaseSchema.index({ platform: 1, status: 1, createdAt: -1 });
LauncherReleaseSchema.index({ version: 1, platform: 1 }, { unique: true });
