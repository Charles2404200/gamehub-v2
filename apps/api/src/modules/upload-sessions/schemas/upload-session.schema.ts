import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UploadSessionStatus } from '@gamehub/shared';

export type UploadSessionDocument = UploadSession & Document;

@Schema({ timestamps: true })
export class UploadSession {
  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PatchVersion', required: true })
  patchVersionId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(UploadSessionStatus),
    default: UploadSessionStatus.CREATED,
  })
  status!: UploadSessionStatus;

  @Prop({ type: Number, default: 0 })
  totalFiles!: number;

  @Prop({ type: Number, default: 0 })
  uploadedFiles!: number;

  @Prop({ type: Number, default: 0 })
  totalSize!: number;

  @Prop({ type: Number, default: 0 })
  uploadedSize!: number;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const UploadSessionSchema = SchemaFactory.createForClass(UploadSession);

// TTL index: MongoDB auto-deletes expired sessions
UploadSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
UploadSessionSchema.index({ patchVersionId: 1 });
