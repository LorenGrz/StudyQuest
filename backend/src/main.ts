import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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
  const corsOriginRaw = cfg.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const corsOrigins = new Set(
    corsOriginRaw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );
  corsOrigins.add('http://localhost:5173');
  corsOrigins.add('http://localhost:5174');
  const corsOrigin = Array.from(corsOrigins);

  // CORS debe ir ANTES de helmet para que no sobreescriba las cabeceras
  app.enableCors({
    origin: corsOrigin,
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
  app.setGlobalPrefix('api/v1');

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
  await app.listen(port);
  console.log(`🚀 API corriendo en http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger en http://localhost:${port}/docs`);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
