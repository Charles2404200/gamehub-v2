import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PatchStatus, PatchMode } from '@gamehub/shared';

export type PatchVersionDocument = PatchVersion & Document;

@Schema({ timestamps: true })
export class PatchVersion {
  @Prop({ type: Types.ObjectId, ref: 'Game', required: true, index: true })
  gameId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  version!: string;

  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, default: '' })
  changelog!: string;

  @Prop({ type: String, enum: Object.values(PatchStatus), default: PatchStatus.DRAFT })
  status!: PatchStatus;

  @Prop({ type: String, enum: Object.values(PatchMode), default: PatchMode.NEW_VERSION })
  mode!: PatchMode;

  @Prop({ type: String, required: true })
  r2Prefix!: string;

  @Prop({ type: String, default: null })
  manifestKey!: string | null;

  @Prop({ type: Number, default: null })
  totalSize!: number | null;

  @Prop({ type: Number, default: null })
  fileCount!: number | null;

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'PatchVersion', default: null })
  replacedPatchVersionId!: Types.ObjectId | null;
}

export const PatchVersionSchema = SchemaFactory.createForClass(PatchVersion);

PatchVersionSchema.index({ gameId: 1, version: 1 }, { unique: true });
PatchVersionSchema.index({ gameId: 1, status: 1, createdAt: -1 });
