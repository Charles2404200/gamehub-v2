import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PatchVersion, PatchVersionDocument } from './schemas/patch-version.schema';
import { PatchFile, PatchFileDocument } from './schemas/patch-file.schema';
import { Game, GameDocument } from '../games/schemas/game.schema';
import { R2Service } from '../r2/r2.service';
import { QueueService } from '../queue/queue.service';
import { CreatePatchVersionDto } from './dto/create-patch-version.dto';
import { PresignFilesDto } from './dto/presign-files.dto';
import { PatchStatus, PatchMode, PatchManifest } from '@gamehub/shared';

@Injectable()
export class PatchVersionsService {
  constructor(
    @InjectModel(PatchVersion.name)
    private readonly patchVersionModel: Model<PatchVersionDocument>,
    @InjectModel(PatchFile.name)
    private readonly patchFileModel: Model<PatchFileDocument>,
    @InjectModel(Game.name)
    private readonly gameModel: Model<GameDocument>,
    private readonly r2Service: R2Service,
    private readonly queueService: QueueService,
  ) {}

  async findByGame(gameId: string): Promise<PatchVersionDocument[]> {
    this.assertObjectId(gameId);
    return this.patchVersionModel
      .find({ gameId: new Types.ObjectId(gameId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<PatchVersionDocument> {
    this.assertObjectId(id);
    const patch = await this.patchVersionModel.findById(id);
    if (!patch) throw new NotFoundException(`Patch version "${id}" not found`);
    return patch;
  }

  async create(gameId: string, dto: CreatePatchVersionDto): Promise<PatchVersionDocument> {
    this.assertObjectId(gameId);

    const game = await this.gameModel.findById(gameId);
    if (!game) throw new NotFoundException(`Game "${gameId}" not found`);

    if (!dto.mode || dto.mode === PatchMode.NEW_VERSION) {
      const exists = await this.patchVersionModel.findOne({
        gameId: new Types.ObjectId(gameId),
        version: dto.version,
      });
      if (exists) throw new ConflictException(`Version "${dto.version}" already exists for this game`);
    }

    const r2Prefix = `games/${gameId}/versions/`;
    const patch = new this.patchVersionModel({
      gameId: new Types.ObjectId(gameId),
      version: dto.version,
      title: dto.title,
      changelog: dto.changelog ?? '',
      mode: dto.mode ?? PatchMode.NEW_VERSION,
      status: PatchStatus.DRAFT,
      r2Prefix,
    });

    return patch.save();
  }

  async presignFiles(
    patchVersionId: string,
    dto: PresignFilesDto,
  ): Promise<Array<{ relativePath: string; uploadUrl: string; r2Key: string; expiresAt: string }>> {
    const patch = await this.findById(patchVersionId);

    if (![PatchStatus.DRAFT, PatchStatus.UPLOADING].includes(patch.status)) {
      throw new BadRequestException(`Patch is not in a state that accepts uploads`);
    }

    patch.status = PatchStatus.UPLOADING;
    await patch.save();

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return Promise.all(
      dto.files.map(async (file) => {
        this.assertSafeRelativePath(file.relativePath);

        const r2Key = `${patch.r2Prefix}${patch._id}/files/${file.relativePath}`;
        const uploadUrl = await this.r2Service.presignPut(r2Key, file.contentType, 3600);

        return { relativePath: file.relativePath, uploadUrl, r2Key, expiresAt };
      }),
    );
  }

  async completeUpload(
    patchVersionId: string,
    files: Array<{ relativePath: string; r2Key: string; size: number; sha256: string; contentType: string }>,
  ): Promise<PatchVersionDocument> {
    const patch = await this.findById(patchVersionId);

    if (patch.status !== PatchStatus.UPLOADING) {
      throw new BadRequestException(`Patch is not in UPLOADING state`);
    }

    // Upsert each file record
    await Promise.all(
      files.map((f) => {
        this.assertSafeRelativePath(f.relativePath);
        return this.patchFileModel.findOneAndUpdate(
          { patchVersionId: patch._id, relativePath: f.relativePath },
          {
            patchVersionId: patch._id,
            gameId: patch.gameId,
            relativePath: f.relativePath,
            r2Key: f.r2Key,
            size: f.size,
            sha256: f.sha256,
            contentType: f.contentType,
          },
          { upsert: true, new: true },
        );
      }),
    );

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    patch.totalSize = totalSize;
    patch.fileCount = files.length;
    patch.status = PatchStatus.PROCESSING;
    return patch.save();
  }

  async publish(patchVersionId: string): Promise<PatchVersionDocument> {
    const patch = await this.findById(patchVersionId);

    if (patch.status !== PatchStatus.PROCESSING) {
      throw new BadRequestException(`Patch must be in PROCESSING state to publish`);
    }

    const patchFiles = await this.patchFileModel.find({ patchVersionId: patch._id });
    const game = await this.gameModel.findById(patch.gameId);
    if (!game) throw new NotFoundException(`Game not found`);

    // Build and upload the manifest to R2
    const manifest: PatchManifest = {
      schemaVersion: 1,
      gameId: String(patch.gameId),
      gameSlug: game.slug,
      patchVersionId: String(patch._id),
      version: patch.version,
      mode: patch.mode,
      title: patch.title,
      changelog: patch.changelog,
      totalSize: patch.totalSize ?? 0,
      fileCount: patchFiles.length,
      createdAt: (patch as unknown as { createdAt: Date }).createdAt.toISOString(),
      publishedAt: new Date().toISOString(),
      files: patchFiles.map((f) => ({
        relativePath: f.relativePath,
        url: this.r2Service.getPublicUrl(f.r2Key),
        r2Key: f.r2Key,
        size: f.size,
        sha256: f.sha256,
        overwrite: true,
      })),
      install: { strategy: 'COPY_OVERWRITE', requiresBackup: true },
    };

    // Upload manifest JSON to R2 via a presigned URL (in prod, use SDK directly in worker)
    const manifestKey = `games/${patch.gameId}/versions/${patch._id}/manifest.json`;
    patch.manifestKey = manifestKey;

    // If this is REPLACE_EXISTING, mark old patch as REPLACED
    if (patch.mode === PatchMode.REPLACE_EXISTING && game.latestPatchVersionId) {
      await this.patchVersionModel.findByIdAndUpdate(game.latestPatchVersionId, {
        status: PatchStatus.REPLACED,
      });
    }

    patch.status = PatchStatus.PUBLISHED;
    patch.publishedAt = new Date();
    await patch.save();

    // Update game's latestPatchVersionId
    game.latestPatchVersionId = new Types.ObjectId(String(patch._id));
    await game.save();

    return patch;
  }

  async getManifest(patchVersionId: string): Promise<PatchManifest> {
    const patch = await this.findById(patchVersionId);
    if (patch.status !== PatchStatus.PUBLISHED) {
      throw new BadRequestException(`Patch is not published`);
    }

    const patchFiles = await this.patchFileModel.find({ patchVersionId: patch._id });
    const game = await this.gameModel.findById(patch.gameId);
    if (!game) throw new NotFoundException(`Game not found`);

    // Use presigned GET URLs (valid 12h) so files are downloadable even without public bucket
    const filesWithUrls = await Promise.all(
      patchFiles.map(async (f) => ({
        relativePath: f.relativePath,
        url: await this.r2Service.presignGet(f.r2Key, 43200),
        r2Key: f.r2Key,
        size: f.size,
        sha256: f.sha256,
        overwrite: true,
      })),
    );

    return {
      schemaVersion: 1,
      gameId: String(patch.gameId),
      gameSlug: game.slug,
      patchVersionId: String(patch._id),
      version: patch.version,
      mode: patch.mode,
      title: patch.title,
      changelog: patch.changelog,
      totalSize: patch.totalSize ?? 0,
      fileCount: patchFiles.length,
      createdAt: (patch as unknown as { createdAt: Date }).createdAt.toISOString(),
      publishedAt: patch.publishedAt?.toISOString() ?? '',
      files: filesWithUrls,
      install: { strategy: 'COPY_OVERWRITE', requiresBackup: true },
    };
  }

  private assertSafeRelativePath(relativePath: string): void {
    if (relativePath.includes('..') || relativePath.startsWith('/')) {
      throw new BadRequestException(`Unsafe file path: "${relativePath}"`);
    }
  }

  private assertObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid id: "${id}"`);
    }
  }

  /**
   * Delete a patch version and enqueue R2 cleanup job
   * Only allowed for DRAFT or ARCHIVED patches
   */
  async delete(patchVersionId: string): Promise<void> {
    this.assertObjectId(patchVersionId);

    const patch = await this.findById(patchVersionId);

    if (![PatchStatus.DRAFT, PatchStatus.ARCHIVED, PatchStatus.FAILED].includes(patch.status)) {
      throw new BadRequestException(
        `Cannot delete patch with status ${patch.status}. Only DRAFT, ARCHIVED, or FAILED patches can be deleted.`,
      );
    }

    // Delete all patch files from MongoDB
    await this.patchFileModel.deleteMany({ patchVersionId: patch._id });

    // Delete patch version from MongoDB
    await this.patchVersionModel.findByIdAndDelete(patchVersionId);

    // Enqueue R2 cleanup job
    await this.queueService.enqueueDeletePatch(patchVersionId);
  }
}
