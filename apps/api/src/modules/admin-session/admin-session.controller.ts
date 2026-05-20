import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminSessionService } from './admin-session.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('admin')
export class AdminSessionController {
  constructor(private readonly adminSessionService: AdminSessionService) {}

  /** Login — rate-limited to 5 attempts per minute */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ token: string }> {
    return this.adminSessionService.login(dto.username, dto.password);
  }

  /** Verify session is still valid */
  @UseGuards(AdminAuthGuard)
  @Get('session')
  session(): { ok: boolean } {
    return { ok: true };
  }

  /** Logout — tokens are stateless (JWT), client just discards the token */
  @UseGuards(AdminAuthGuard)
  @Post('logout')
  logout(): { ok: boolean } {
    return { ok: true };
  }
}
