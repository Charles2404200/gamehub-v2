import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LauncherController } from './launcher.controller';
import { LauncherService } from './launcher.service';
import { Game, GameSchema } from '../games/schemas/game.schema';
import { PatchVersion, PatchVersionSchema } from '../patch-versions/schemas/patch-version.schema';
import {
  LauncherRelease,
  LauncherReleaseSchema,
} from '../launcher-releases/schemas/launcher-release.schema';
import { DownloadEvent, DownloadEventSchema, InstallReport, InstallReportSchema } from './schemas/events.schema';
import { PatchVersionsModule } from '../patch-versions/patch-versions.module';

@Module({
  imports: [
    PatchVersionsModule,
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: PatchVersion.name, schema: PatchVersionSchema },
      { name: LauncherRelease.name, schema: LauncherReleaseSchema },
      { name: DownloadEvent.name, schema: DownloadEventSchema },
      { name: InstallReport.name, schema: InstallReportSchema },
    ]),
  ],
  controllers: [LauncherController],
  providers: [LauncherService],
})
export class LauncherModule {}
