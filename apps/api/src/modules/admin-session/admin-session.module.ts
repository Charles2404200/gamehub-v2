import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminSessionController } from './admin-session.controller';
import { AdminSessionService } from './admin-session.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Module({
  imports: [
    // Secret provided per-call via ConfigService, so no global secret here
    JwtModule.register({}),
  ],
  controllers: [AdminSessionController],
  providers: [AdminSessionService, AdminAuthGuard],
  exports: [AdminAuthGuard, JwtModule],
})
export class AdminSessionModule {}
