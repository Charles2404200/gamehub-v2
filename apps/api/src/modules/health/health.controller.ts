import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly mongoose: Connection) {}

  @Get()
  check(): Record<string, string> {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return {
      status: 'ok',
      db: dbState[this.mongoose.readyState] ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
}
