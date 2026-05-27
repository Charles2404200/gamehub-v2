import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface AdminJwtPayload {
  sub: 'admin';
  type: 'admin-session';
  iat?: number;
  exp?: number;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Admin token required');
    }

    try {
      const secret = this.configService.getOrThrow<string>('ADMIN_SESSION_SECRET');
      const payload = this.jwtService.verify<AdminJwtPayload>(token, { secret });

      if (payload.sub !== 'admin' || payload.type !== 'admin-session') {
        throw new UnauthorizedException('Invalid admin token payload');
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired admin token');
    }

    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7);
    }

    const fallbackHeader = request.headers['x-admin-token'];
    if (typeof fallbackHeader === 'string' && fallbackHeader.trim()) {
      return fallbackHeader.trim();
    }

    if (Array.isArray(fallbackHeader)) {
      const first = fallbackHeader.find((v) => typeof v === 'string' && v.trim());
      if (first) return first.trim();
    }

    const cookieToken = this.extractCookieToken(request.headers.cookie, 'admin_session');
    if (cookieToken) return cookieToken;

    return undefined;
  }

  private extractCookieToken(cookieHeader: string | undefined, key: string): string | undefined {
    if (!cookieHeader) return undefined;

    const parts = cookieHeader.split(';');
    for (const part of parts) {
      const [rawName, ...rest] = part.trim().split('=');
      if (rawName !== key) continue;
      const rawValue = rest.join('=').trim();
      if (!rawValue) return undefined;
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }

    return undefined;
  }
}
