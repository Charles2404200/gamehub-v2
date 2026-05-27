import { Controller, Post, Body, Get, UseGuards, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AdminSessionService } from './admin-session.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('admin')
export class AdminSessionController {
  constructor(private readonly adminSessionService: AdminSessionService) {}

  private getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    };
  }

  /** Login — rate-limited to 5 attempts per minute */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string }> {
    const session = await this.adminSessionService.login(dto.username, dto.password);
    res.cookie('admin_session', session.token, this.getCookieOptions());
    return session;
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
  logout(@Res({ passthrough: true }) res: Response): { ok: boolean } {
    res.clearCookie('admin_session', { path: '/' });
    return { ok: true };
  }
}
