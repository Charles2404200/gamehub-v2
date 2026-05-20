import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LauncherPlatform, LauncherReleaseStatus } from '@gamehub/shared';

export type LauncherReleaseDocument = LauncherRelease & Document;

@Schema({ timestamps: true })
export class LauncherRelease {
  @Prop({ type: String, required: true })
  version!: string;

  @Prop({ type: String, enum: Object.values(LauncherPlatform), required: true })
  platform!: LauncherPlatform;

  @Prop({
    type: String,
    enum: Object.values(LauncherReleaseStatus),
    default: LauncherReleaseStatus.DRAFT,
  })
  status!: LauncherReleaseStatus;

  @Prop({ type: Boolean, default: false })
  forceUpdate!: boolean;

  @Prop({ type: String, required: true })
  minSupportedVersion!: string;

  @Prop({ default: '' })
  releaseNotes!: string;

  @Prop({ type: String, required: true })
  updateBaseUrl!: string;

  @Prop({ type: [String], default: [] })
  artifactKeys!: string[];

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;
}

export const LauncherReleaseSchema = SchemaFactory.createForClass(LauncherRelease);

LauncherReleaseSchema.index({ platform: 1, status: 1, createdAt: -1 });
LauncherReleaseSchema.index({ version: 1, platform: 1 }, { unique: true });
