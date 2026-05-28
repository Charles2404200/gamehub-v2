import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { LauncherReleasesService } from './launcher-releases.service';
import { CreateLauncherReleaseDto } from './dto/create-launcher-release.dto';
import { SetForceUpdateDto } from './dto/set-force-update.dto';
import { PresignArtifactsDto } from './dto/presign-artifacts.dto';

@UseGuards(AdminAuthGuard)
@Controller('admin/launcher/releases')
export class LauncherReleasesController {
  constructor(private readonly service: LauncherReleasesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLauncherReleaseDto) {
    return this.service.create(dto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Post(':id/force-update')
  setForceUpdate(@Param('id') id: string, @Body() dto: SetForceUpdateDto) {
    return this.service.setForceUpdate(id, dto.forceUpdate ?? true);
  }

  @Post(':id/presign-artifacts')
  presignArtifacts(@Param('id') id: string, @Body() dto: PresignArtifactsDto) {
    return this.service.presignArtifacts(id, dto.artifacts);
  }
}
