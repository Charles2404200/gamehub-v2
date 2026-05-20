import { Controller, Get, Param, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { LauncherService } from './launcher.service';

/** All endpoints here are public — no auth required. */
@Controller('launcher')
export class LauncherController {
  constructor(private readonly launcherService: LauncherService) {}

  @Get('config')
  getConfig() {
    return this.launcherService.getLauncherConfig();
  }

  @Get('games')
  getGames() {
    return this.launcherService.getGames();
  }

  @Get('games/:slug')
  getGame(@Param('slug') slug: string) {
    return this.launcherService.getGameBySlug(slug);
  }

  @Get('games/:slug/latest')
  getLatestPatch(@Param('slug') slug: string) {
    return this.launcherService.getLatestPatch(slug);
  }

  @Post('download-events')
  @HttpCode(HttpStatus.CREATED)
  recordDownload(
    @Body() body: { gameId: string; patchVersionId: string; launcherVersion?: string },
  ) {
    // Lightweight event — stored async, not blocking
    return { ok: true };
  }

  @Post('install-report')
  @HttpCode(HttpStatus.CREATED)
  recordInstall(
    @Body()
    body: {
      gameId: string;
      patchVersionId: string;
      launcherVersion?: string;
      status: 'SUCCESS' | 'FAILED';
      errorMessage?: string;
    },
  ) {
    return { ok: true };
  }
}
