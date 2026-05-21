import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { GamesService } from './games.service';
import { R2Service } from '../r2/r2.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { GameStatus } from '@gamehub/shared';

@UseGuards(AdminAuthGuard)
@Controller('admin/games')
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly r2Service: R2Service,
  ) {}

  @Get()
  findAll(@Query('status') status?: GameStatus) {
    return this.gamesService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gamesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.gamesService.softDelete(id);
  }

  /** Presign a PUT URL for the game cover image */
  @Post(':id/cover/presign')
  async presignCover(@Param('id') id: string) {
    await this.gamesService.findById(id);
    const key = `games/${id}/cover/cover.webp`;
    const uploadUrl = await this.r2Service.presignPut(key, 'image/webp');
    return { key, uploadUrl };
  }

  /** Presign a PUT URL for the game banner image */
  @Post(':id/banner/presign')
  async presignBanner(@Param('id') id: string) {
    await this.gamesService.findById(id);
    const key = `games/${id}/banner/banner.webp`;
    const uploadUrl = await this.r2Service.presignPut(key, 'image/webp');
    return { key, uploadUrl };
  }

  /** Presign a PUT URL for a new screenshot */
  @Post(':id/screenshots/presign')
  async presignScreenshot(@Param('id') id: string) {
    await this.gamesService.findById(id);
    const idx = Date.now();
    const key = `games/${id}/screenshots/${idx}.webp`;
    const uploadUrl = await this.r2Service.presignPut(key, 'image/webp');
    return { key, uploadUrl };
  }

  /** After uploading to R2, register screenshot (or add by external URL) */
  @Post(':id/screenshots')
  async addScreenshot(
    @Param('id') id: string,
    @Body() body: { key?: string; url?: string },
  ) {
    let key = body.key ?? '';
    let url = body.url ?? '';

    // If only URL provided (external link), store with url as key
    if (!key && url) {
      key = url;
    }
    if (!url && key) {
      url = this.r2Service.getPublicUrl(key);
    }

    return this.gamesService.addScreenshot(id, { key, url });
  }

  /** Remove a screenshot by key */
  @Delete(':id/screenshots')
  async removeScreenshot(
    @Param('id') id: string,
    @Body() body: { key: string },
  ) {
    // Delete from R2 if it's an R2 key (not an external URL)
    if (body.key && !body.key.startsWith('http')) {
      await this.r2Service.deleteObjects([body.key]).catch(() => null);
    }
    return this.gamesService.removeScreenshot(id, body.key);
  }

  /** After uploading to R2, save the media URLs to the game document */
  @Patch(':id/media')
  async updateMedia(
    @Param('id') id: string,
    @Body()
    body: {
      coverImage?: { key: string; url?: string };
      bannerImage?: { key: string; url?: string };
    },
  ) {
    const media: Parameters<GamesService['updateMedia']>[1] = {};

    if (body.coverImage) {
      media.coverImage = {
        key: body.coverImage.key,
        url: body.coverImage.url ?? this.r2Service.getPublicUrl(body.coverImage.key),
      };
    }
    if (body.bannerImage) {
      media.bannerImage = {
        key: body.bannerImage.key,
        url: body.bannerImage.url ?? this.r2Service.getPublicUrl(body.bannerImage.key),
      };
    }

    return this.gamesService.updateMedia(id, media);
  }
}
