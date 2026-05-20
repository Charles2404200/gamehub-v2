import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UploadSession, UploadSessionDocument } from './schemas/upload-session.schema';
import { UploadSessionStatus } from '@gamehub/shared';

@Injectable()
export class UploadSessionsService {
  constructor(
    @InjectModel(UploadSession.name)
    private readonly sessionModel: Model<UploadSessionDocument>,
  ) {}

  /**
   * Create a new upload session for a patch version
   */
  async createSession(
    gameId: string,
    patchVersionId: string,
    totalFiles: number,
    totalSize: number,
  ): Promise<UploadSessionDocument> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return new this.sessionModel({
      gameId: new Types.ObjectId(gameId),
      patchVersionId: new Types.ObjectId(patchVersionId),
      status: UploadSessionStatus.CREATED,
      totalFiles,
      totalSize,
      uploadedFiles: 0,
      uploadedSize: 0,
      expiresAt,
    }).save();
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<UploadSessionDocument> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException(`Upload session "${sessionId}" not found`);

    // Check if expired
    if (session.expiresAt < new Date()) {
      throw new BadRequestException('Upload session expired');
    }

    return session;
  }

  /**
   * Update session with uploaded file info
   */
  async updateSessionProgress(
    sessionId: string,
    uploadedFileCount: number,
    uploadedSize: number,
  ): Promise<UploadSessionDocument> {
    const session = await this.getSession(sessionId);

    if (session.status === UploadSessionStatus.CREATED) {
      session.status = UploadSessionStatus.UPLOADING;
    }

    session.uploadedFiles = uploadedFileCount;
    session.uploadedSize = uploadedSize;

    return session.save();
  }

  /**
   * Mark session as completed
   */
  async completeSession(sessionId: string): Promise<UploadSessionDocument> {
    const session = await this.getSession(sessionId);

    if (session.status !== UploadSessionStatus.UPLOADING) {
      throw new BadRequestException('Session is not in UPLOADING state');
    }

    session.status = UploadSessionStatus.COMPLETED;
    return session.save();
  }

  /**
   * Mark session as failed
   */
  async failSession(sessionId: string, reason?: string): Promise<UploadSessionDocument> {
    const session = await this.getSession(sessionId);
    session.status = UploadSessionStatus.FAILED;
    return session.save();
  }

  /**
   * Get all sessions for a patch version
   */
  async getSessionsByPatchVersion(
    patchVersionId: string,
  ): Promise<UploadSessionDocument[]> {
    return this.sessionModel
      .find({ patchVersionId: new Types.ObjectId(patchVersionId) })
      .sort({ createdAt: -1 })
      .exec();
  }
}
