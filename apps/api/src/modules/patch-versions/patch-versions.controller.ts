import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PatchVersionsService } from './patch-versions.service';
import { CreatePatchVersionDto } from './dto/create-patch-version.dto';
import { PresignFilesDto } from './dto/presign-files.dto';

@UseGuards(AdminAuthGuard)
@Controller()
export class PatchVersionsController {
  constructor(private readonly patchVersionsService: PatchVersionsService) {}

  @Get('admin/games/:gameId/patches')
  findByGame(@Param('gameId') gameId: string) {
    return this.patchVersionsService.findByGame(gameId);
  }

  @Post('admin/games/:gameId/patches')
  create(@Param('gameId') gameId: string, @Body() dto: CreatePatchVersionDto) {
    return this.patchVersionsService.create(gameId, dto);
  }

  @Get('admin/patches/:patchVersionId')
  findOne(@Param('patchVersionId') id: string) {
    return this.patchVersionsService.findById(id);
  }

  /** Generate presigned PUT URLs for a batch of files */
  @Post('admin/patches/:patchVersionId/presign-files')
  presignFiles(@Param('patchVersionId') id: string, @Body() dto: PresignFilesDto) {
    return this.patchVersionsService.presignFiles(id, dto);
  }

  /** Admin calls this after all files are uploaded to R2 */
  @Post('admin/patches/:patchVersionId/complete-upload')
  completeUpload(
    @Param('patchVersionId') id: string,
    @Body()
    body: {
      files: Array<{
        relativePath: string;
        r2Key: string;
        size: number;
        sha256: string;
        contentType: string;
      }>;
    },
  ) {
    return this.patchVersionsService.completeUpload(id, body.files);
  }

  /** Publish the patch — builds manifest and updates game.latestPatchVersionId */
  @Post('admin/patches/:patchVersionId/publish')
  publish(@Param('patchVersionId') id: string) {
    return this.patchVersionsService.publish(id);
  }

  /** Public: get the manifest for a published patch */
  @Get('launcher/patches/:patchVersionId/manifest')
  @HttpCode(HttpStatus.OK)
  getManifest(@Param('patchVersionId') id: string) {
    return this.patchVersionsService.getManifest(id);
  }

  /** Delete a patch version */
  @Delete('admin/patches/:patchVersionId')
  delete(@Param('patchVersionId') id: string) {
    return this.patchVersionsService.delete(id);
  }
}
