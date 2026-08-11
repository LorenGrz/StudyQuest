import './polyfill';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT', 3000);
  // CORS debe ir ANTES de helmet para que no sobreescriba las cabeceras
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
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
        const [{ count }] = await dataSource.query('SELECT COUNT(*)::int as count FROM users');
        if (count === 0) {
          console.log('🌱 No users found in database. Running seed script...');
          const { execSync } = await import('child_process');
          execSync('pnpm run seed', { stdio: 'inherit' });
          console.log('✅ Seeding completed.');
        }
      }
    } catch (err) {
      console.error('⚠️ Failed to check database or run seed automatically:', err);
    }
  }

  await app.listen(port);
  console.log(`🚀 API corriendo en http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger en http://localhost:${port}/docs`);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
