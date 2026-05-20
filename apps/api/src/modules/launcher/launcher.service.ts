import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game, GameDocument } from '../games/schemas/game.schema';
import { PatchVersion, PatchVersionDocument } from '../patch-versions/schemas/patch-version.schema';
import { ConfigService } from '@nestjs/config';
import { GameStatus, PatchStatus, LauncherConfig } from '@gamehub/shared';

@Injectable()
export class LauncherService {
  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    @InjectModel(PatchVersion.name)
    private readonly patchVersionModel: Model<PatchVersionDocument>,
    private readonly configService: ConfigService,
  ) {}

  getLauncherConfig(): LauncherConfig {
    return {
      latestVersion: this.configService.get('LATEST_LAUNCHER_VERSION', '1.0.0'),
      minSupportedVersion: this.configService.get('MIN_SUPPORTED_LAUNCHER_VERSION', '1.0.0'),
      forceUpdate: this.configService.get('FORCE_UPDATE_ENABLED', 'false') === 'true',
      updateBaseUrl: this.configService.getOrThrow('LAUNCHER_UPDATE_BASE_URL'),
    };
  }

  async getGames(): Promise<GameDocument[]> {
    return this.gameModel
      .find({ status: GameStatus.ACTIVE })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getGameBySlug(slug: string): Promise<GameDocument | null> {
    return this.gameModel.findOne({ slug, status: GameStatus.ACTIVE });
  }

  async getLatestPatch(slug: string): Promise<PatchVersionDocument | null> {
    const game = await this.gameModel.findOne({ slug, status: GameStatus.ACTIVE });
    if (!game?.latestPatchVersionId) return null;

    return this.patchVersionModel.findOne({
      _id: game.latestPatchVersionId,
      status: PatchStatus.PUBLISHED,
    });
  }
}
