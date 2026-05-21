import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { Game, GameSchema } from './schemas/game.schema';
import { PatchVersion, PatchVersionSchema } from '../patch-versions/schemas/patch-version.schema';
import { AdminSessionModule } from '../admin-session/admin-session.module';
import { R2Module } from '../r2/r2.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: PatchVersion.name, schema: PatchVersionSchema },
    ]),
    AdminSessionModule,
    R2Module,
    QueueModule,
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService, MongooseModule],
})
export class GamesModule {}
