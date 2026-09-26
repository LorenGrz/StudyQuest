import './polyfill';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { corsOrigin } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // One reverse proxy (Caddy) sits in front: trust its X-Forwarded-For so
  // req.ip — and therefore rate limiting — is per client, not per proxy.
  app.set('trust proxy', 1);
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT', 3000);

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  app.use(helmet({ crossOriginResourcePolicy: false }));
  // Cosmetic border SVGs are static app assets (not user uploads), served
  // as-is. User uploads (quest docs, chat attachments, avatars) live in S3
  // and go through GET /api/v1/files/<key> (see FilesController) instead.
  app.use(
    '/static/borders',
    express.static(join(process.cwd(), 'static', 'borders')),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  if (cfg.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('StudyQuest API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  app.enableShutdownHooks();

  // La búsqueda global y el explorador de materias usan similarity() de pg_trgm.
  // Neon/Docker lo traían; en Aiven hay que crearlo. Idempotente y no fatal.
  try {
    const { DataSource } = await import('typeorm');
    const ds = app.get(DataSource);
    await ds.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await ds.query('CREATE EXTENSION IF NOT EXISTS unaccent');
  } catch (err) {
    console.error('⚠️ No se pudo asegurar pg_trgm/unaccent:', err);
  }

  if (cfg.get('NODE_ENV') === 'development') {
    try {
      const { DataSource } = await import('typeorm');
      const dataSource = app.get(DataSource);

      const tableCheck = await dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        ) as "exists"
      `);

      if (tableCheck[0]?.exists) {
        const [{ count }] = await dataSource.query(
          'SELECT COUNT(*)::int as count FROM users',
        );
        if (count === 0) {
          console.log('🌱 No users found in database. Running seed script...');
          const { execSync } = await import('child_process');
          execSync('pnpm run seed', { stdio: 'inherit' });
          console.log('✅ Seeding completed.');
        }
      }
    } catch (err) {
      console.error(
        '⚠️ Failed to check database or run seed automatically:',
        err,
      );
    }
  }

  await app.listen(port);
  console.log(`🚀 API corriendo en http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger en http://localhost:${port}/docs`);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
