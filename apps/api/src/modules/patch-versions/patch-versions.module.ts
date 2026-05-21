import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatchVersionsController } from './patch-versions.controller';
import { PatchVersionsService } from './patch-versions.service';
import { PatchVersion, PatchVersionSchema } from './schemas/patch-version.schema';
import { PatchFile, PatchFileSchema } from './schemas/patch-file.schema';
import { Game, GameSchema } from '../games/schemas/game.schema';
import { AdminSessionModule } from '../admin-session/admin-session.module';
import { R2Module } from '../r2/r2.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatchVersion.name, schema: PatchVersionSchema },
      { name: PatchFile.name, schema: PatchFileSchema },
      { name: Game.name, schema: GameSchema },
    ]),
    AdminSessionModule,
    R2Module,
    QueueModule,
  ],
  controllers: [PatchVersionsController],
  providers: [PatchVersionsService],
  exports: [PatchVersionsService, MongooseModule],
})
export class PatchVersionsModule {}
