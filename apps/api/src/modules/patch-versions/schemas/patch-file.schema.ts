import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatchFileDocument = PatchFile & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PatchFile {
  @Prop({ type: Types.ObjectId, ref: 'PatchVersion', required: true })
  patchVersionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  relativePath!: string;

  @Prop({ type: String, required: true })
  r2Key!: string;

  @Prop({ type: Number, required: true })
  size!: number;

  @Prop({ type: String, required: true })
  sha256!: string;

  @Prop({ default: 'application/octet-stream' })
  contentType!: string;
}

export const PatchFileSchema = SchemaFactory.createForClass(PatchFile);

PatchFileSchema.index({ patchVersionId: 1, relativePath: 1 }, { unique: true });
PatchFileSchema.index({ gameId: 1 });
