import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LauncherRelease, LauncherReleaseDocument } from './schemas/launcher-release.schema';
import { R2Service } from '../r2/r2.service';
import { LauncherReleaseStatus } from '@gamehub/shared';
import { CreateLauncherReleaseDto } from './dto/create-launcher-release.dto';

@Injectable()
export class LauncherReleasesService {
  constructor(
    @InjectModel(LauncherRelease.name)
    private readonly releaseModel: Model<LauncherReleaseDocument>,
    private readonly r2Service: R2Service,
  ) {}

  async findAll(): Promise<LauncherReleaseDocument[]> {
    return this.releaseModel.find().sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateLauncherReleaseDto): Promise<LauncherReleaseDocument> {
    const exists = await this.releaseModel.findOne({
      version: dto.version,
      platform: dto.platform,
    });
    if (exists) {
      throw new ConflictException(
        `Release ${dto.version} for ${dto.platform} already exists`,
      );
    }

    const updateBaseUrl = this.r2Service.getPublicUrl(
      `launcher-updates/${dto.platform}`,
    );

    return new this.releaseModel({
      version: dto.version,
      platform: dto.platform,
      releaseNotes: dto.releaseNotes ?? '',
      minSupportedVersion: dto.minSupportedVersion ?? dto.version,
      updateBaseUrl,
      status: LauncherReleaseStatus.DRAFT,
    }).save();
  }

  async publish(id: string): Promise<LauncherReleaseDocument> {
    const release = await this.findById(id);
    if (release.status === LauncherReleaseStatus.PUBLISHED) {
      throw new BadRequestException('Release is already published');
    }
    release.status = LauncherReleaseStatus.PUBLISHED;
    release.publishedAt = new Date();
    return release.save();
  }

  /** Enable force update — all launchers below minSupportedVersion must update */
  async setForceUpdate(id: string, forceUpdate: boolean): Promise<LauncherReleaseDocument> {
    const release = await this.findById(id);
    release.forceUpdate = forceUpdate;
    return release.save();
  }

  async presignArtifacts(
    id: string,
    artifacts: Array<{ filename: string; contentType: string }>,
  ): Promise<Array<{ filename: string; uploadUrl: string; r2Key: string }>> {
    const release = await this.findById(id);

    const presignedArtifacts = await Promise.all(
      artifacts.map(async (a) => {
        const r2Key = `launcher-updates/${release.platform}/${a.filename}`;
        const uploadUrl = await this.r2Service.presignPut(r2Key, a.contentType, 7200);
        return { filename: a.filename, uploadUrl, r2Key };
      }),
    );

    release.artifactKeys = Array.from(
      new Set([...(release.artifactKeys ?? []), ...presignedArtifacts.map((a) => a.r2Key)]),
    );
    await release.save();

    return presignedArtifacts;
  }

  async remove(id: string): Promise<void> {
    const release = await this.findById(id);

    if (release.artifactKeys?.length) {
      await this.r2Service.deleteObjects(release.artifactKeys);
    }

    await release.deleteOne();
  }

  private async findById(id: string): Promise<LauncherReleaseDocument> {
    const release = await this.releaseModel.findById(id);
    if (!release) throw new NotFoundException(`Launcher release "${id}" not found`);
    return release;
  }
}
