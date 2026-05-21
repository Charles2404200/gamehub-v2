import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Game, GameDocument } from './schemas/game.schema';
import { PatchVersion, PatchVersionDocument } from '../patch-versions/schemas/patch-version.schema';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { GameStatus } from '@gamehub/shared';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    @InjectModel(PatchVersion.name)
    private readonly patchVersionModel: Model<PatchVersionDocument>,
    private readonly queueService: QueueService,
  ) {}

  async findAll(status?: GameStatus): Promise<GameDocument[]> {
    const filter = status ? { status } : { status: { $ne: GameStatus.DELETED } };
    return this.gameModel.find(filter).sort({ updatedAt: -1 }).exec();
  }

  async findBySlug(slug: string): Promise<GameDocument> {
    const game = await this.gameModel.findOne({ slug, status: { $ne: GameStatus.DELETED } });
    if (!game) throw new NotFoundException(`Game "${slug}" not found`);
    return game;
  }

  async findById(id: string): Promise<GameDocument> {
    this.assertObjectId(id);
    const game = await this.gameModel.findById(id);
    if (!game || game.status === GameStatus.DELETED) {
      throw new NotFoundException(`Game "${id}" not found`);
    }
    return game;
  }

  async create(dto: CreateGameDto): Promise<GameDocument> {
    const exists = await this.gameModel.findOne({ slug: dto.slug });
    if (exists) throw new ConflictException(`Slug "${dto.slug}" already exists`);

    const game = new this.gameModel(dto);
    return game.save();
  }

  async update(id: string, dto: UpdateGameDto): Promise<GameDocument> {
    const game = await this.findById(id);

    const dtoSlug = (dto as { slug?: string }).slug;
    if (dtoSlug && dtoSlug !== game.slug) {
      const exists = await this.gameModel.findOne({ slug: dtoSlug });
      if (exists) throw new ConflictException(`Slug "${dtoSlug}" already taken`);
    }

    Object.assign(game, dto);
    return game.save();
  }

  async updateMedia(
    id: string,
    media: { coverImage?: { key: string; url: string }; bannerImage?: { key: string; url: string } },
  ): Promise<GameDocument> {
    const game = await this.findById(id);
    if (media.coverImage) game.coverImage = media.coverImage;
    if (media.bannerImage) game.bannerImage = media.bannerImage;
    return game.save();
  }

  async softDelete(id: string): Promise<void> {
    const game = await this.findById(id);
    game.status = GameStatus.DELETING;
    game.deletedAt = new Date();
    await game.save();
    // Enqueue R2 cleanup job
    await this.queueService.enqueueDeleteGame(game._id.toString());
  }

  private assertObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid id: "${id}"`);
    }
  }
}
