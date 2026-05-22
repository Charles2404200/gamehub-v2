import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn'],
    bodyParser: false,
  });

  // Increase JSON body limit (default 100kb too small for large patch presign batches)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(helmet());

  // CORS: allow admin panel + Electron (no origin) + all localhost in dev
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = (process.env.ALLOWED_ORIGINS ?? process.env.ADMIN_ORIGIN ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      const isLocalhost = origin?.startsWith('http://localhost:');
      if (!origin || allowed.includes(origin) || isLocalhost) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`GameHub API running on port ${port}`);
}

bootstrap();
