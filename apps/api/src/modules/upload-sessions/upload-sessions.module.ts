import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadSession, UploadSessionSchema } from './schemas/upload-session.schema';
import { UploadSessionsService } from './upload-sessions.service';

/**
 * UploadSessionsModule manages the lifecycle of an upload session.
 * Sessions are created when admin starts a patch upload and expire via MongoDB TTL index.
 * Actual upload tracking is lightweight — the heavy lifting is done by the admin web client
 * directly against R2 using presigned URLs from PatchVersionsService.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: UploadSession.name, schema: UploadSessionSchema }]),
  ],
  providers: [UploadSessionsService],
  exports: [UploadSessionsService, MongooseModule],
})
export class UploadSessionsModule {}
