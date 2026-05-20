import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { AuditAction, AuditEntityType } from '@gamehub/shared';
import { Request } from 'express';
import * as crypto from 'crypto';

export interface LogActionOptions {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(options: LogActionOptions): Promise<void> {
    await new this.auditLogModel({
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId ?? null,
      metadata: options.metadata ?? null,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    }).save();
  }

  /**
   * Log an admin action with request context
   */
  async logAction(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | null,
    metadata: Record<string, unknown> | null,
    request: Request,
  ): Promise<AuditLogDocument> {
    const log = new this.auditLogModel({
      action,
      entityType,
      entityId,
      metadata,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    const saved = await log.save();
    this.logger.log(
      `[${action}] ${entityType} ${entityId}: ${JSON.stringify(metadata)}`,
    );
    return saved;
  }

  /**
   * Get audit logs for an entity
   */
  async getLogsForEntity(
    entityType: AuditEntityType,
    entityId: string,
  ): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ entityType, entityId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get audit logs by action
   */
  async getLogsByAction(action: AuditAction): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ action })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit = 50): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Extract client IP from request (handles proxies)
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Hash IP for privacy (can be used to identify users without exposing IP)
   */
  static hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  }
}
