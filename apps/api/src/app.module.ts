import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminSessionModule } from './modules/admin-session/admin-session.module';
import { GamesModule } from './modules/games/games.module';
import { PatchVersionsModule } from './modules/patch-versions/patch-versions.module';
import { UploadSessionsModule } from './modules/upload-sessions/upload-sessions.module';
import { R2Module } from './modules/r2/r2.module';
import { LauncherModule } from './modules/launcher/launcher.module';
import { LauncherReleasesModule } from './modules/launcher-releases/launcher-releases.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { QueueModule } from './modules/queue/queue.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),

    // Throttle admin login: 5 attempts per minute
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),

    AdminSessionModule,
    GamesModule,
    PatchVersionsModule,
    UploadSessionsModule,
    R2Module,
    LauncherModule,
    LauncherReleasesModule,
    AuditLogsModule,
    QueueModule,
    HealthModule,
  ],
})
export class AppModule {}
