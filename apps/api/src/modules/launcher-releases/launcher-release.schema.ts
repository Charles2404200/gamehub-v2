import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { LauncherPlatform, LauncherReleaseStatus } from '@gamehub/shared';

export type LauncherReleaseDocument = HydratedDocument<LauncherRelease>;

@Schema({ timestamps: true })
export class LauncherRelease {
  @Prop({ required: true, index: true })
  version!: string;

  @Prop({ required: true, enum: LauncherPlatform, index: true })
  platform!: LauncherPlatform;

  @Prop({ required: true, enum: LauncherReleaseStatus, default: LauncherReleaseStatus.DRAFT })
  status!: LauncherReleaseStatus;

  @Prop({ required: true, default: false })
  forceUpdate!: boolean;

  @Prop({ required: true })
  minSupportedVersion!: string;

  @Prop({ required: true, default: '' })
  releaseNotes!: string;

  @Prop({ required: true })
  updateBaseUrl!: string;

  @Prop({ required: true, type: [String], default: [] })
  artifactKeys!: string[];

  @Prop({ type: Date, nullable: true })
  publishedAt?: Date | null;

  @Prop({ index: true })
  createdAt?: Date;

  @Prop({ index: true })
  updatedAt?: Date;
}

export const LauncherReleaseSchema = SchemaFactory.createForClass(LauncherRelease);

// Indexes
LauncherReleaseSchema.index({ platform: 1, status: 1, createdAt: -1 });
LauncherReleaseSchema.index({ version: 1, platform: 1 }, { unique: true });
