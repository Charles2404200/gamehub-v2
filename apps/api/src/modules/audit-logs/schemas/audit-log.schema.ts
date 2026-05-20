import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AuditAction, AuditEntityType } from '@gamehub/shared';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ type: String, enum: Object.values(AuditAction), required: true })
  action!: AuditAction;

  @Prop({ type: String, enum: Object.values(AuditEntityType), required: true })
  entityType!: AuditEntityType;

  @Prop({ type: String, default: null })
  entityId!: string | null;

  @Prop({ type: Object, default: null })
  metadata!: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  ipAddress!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
