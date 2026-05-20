import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LauncherReleasesController } from './launcher-releases.controller';
import { LauncherReleasesService } from './launcher-releases.service';
import { LauncherRelease, LauncherReleaseSchema } from './schemas/launcher-release.schema';
import { AdminSessionModule } from '../admin-session/admin-session.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LauncherRelease.name, schema: LauncherReleaseSchema },
    ]),
    AdminSessionModule,
    R2Module,
  ],
  controllers: [LauncherReleasesController],
  providers: [LauncherReleasesService],
})
export class LauncherReleasesModule {}
