import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminSessionService {
  private readonly logger = new Logger(AdminSessionService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<{ token: string }> {
    const expectedUsername = this.configService.getOrThrow<string>('ADMIN_USERNAME');
    const expectedHash = this.configService.getOrThrow<string>('ADMIN_PASSWORD_HASH');

    const usernameMatch = username === expectedUsername;
    const passwordMatch = usernameMatch && (await bcrypt.compare(password, expectedHash));

    if (!usernameMatch || !passwordMatch) {
      this.logger.warn(`Failed admin login attempt for username: "${username}"`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const secret = this.configService.getOrThrow<string>('ADMIN_SESSION_SECRET');
    const token = this.jwtService.sign(
      { sub: 'admin', type: 'admin-session' },
      { secret, expiresIn: '8h' },
    );

    this.logger.log('Admin login successful');
    return { token };
  }
}
