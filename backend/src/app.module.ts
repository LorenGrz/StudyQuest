/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { resolve } from 'path';
import { safeUploadFilename } from './common/upload.util';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { PartiesModule } from './modules/parties/parties.module';
import { QuestsModule } from './modules/quests/quests.module';
import { AiModule } from './modules/ai/ai.module';
import { SkillTreeModule } from './modules/skill-tree/skill-tree.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { MatchmakingModule } from './gateways/matchmaking/matchmaking.module';
import { SearchModule } from './modules/search/search.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    // Bind the throttler globally — `ThrottlerModule.forRoot` alone does nothing.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../.env'),
        resolve(__dirname, '../.env'),
        resolve(__dirname, '../../.env'),
      ],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): TypeOrmModuleOptions => {
        const url = cfg.get<string>('DATABASE_URL');
        const base = {
          type: 'postgres' as const,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
          synchronize: cfg.get<string>('TYPEORM_SYNC') === 'true',
          logging: cfg.get<string>('TYPEORM_LOGGING') === 'true',
          extra: { max: 5 },
        };
        if (url) {
          // pg >=8.16 (pg-connection-string) trata `sslmode=require` como
          // `verify-full`, lo que rechaza las cadenas de CA autofirmadas que
          // presentan Aiven / Neon / Supabase (SELF_SIGNED_CERT_IN_CHAIN).
          // Quitamos ese parámetro y forzamos TLS sin verificar la CA.
          const parsed = new URL(url);
          parsed.searchParams.delete('sslmode');
          parsed.searchParams.delete('ssl');
          return {
            ...base,
            url: parsed.toString(),
            ssl: { rejectUnauthorized: false },
          };
        }
        return {
          ...base,
          host: cfg.get<string>('POSTGRES_HOST', 'localhost'),
          port: cfg.get<number>('POSTGRES_PORT', 5432),
          username: cfg.get<string>('POSTGRES_USER', 'studyquest'),
          password: cfg.get<string>('POSTGRES_PASSWORD'),
          database: cfg.get<string>('POSTGRES_DB', 'studyquest'),
        };
      },
    }),

    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
      { name: 'strict', ttl: 60_000, limit: 10 },
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => cb(null, safeUploadFilename(file)),
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'audio/webm',
          'audio/ogg',
          'audio/mp4',
          'audio/mpeg',
        ];
        cb(null, allowed.includes(file.mimetype));
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),

    AuthModule,
    UsersModule,
    SubjectsModule,
    PartiesModule,
    QuestsModule,
    AiModule,
    SkillTreeModule,
    AchievementsModule,
    MatchmakingModule,
    SearchModule,
    TournamentsModule,
  ],
})
export class AppModule {}
