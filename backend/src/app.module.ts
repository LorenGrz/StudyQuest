/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { v4 as uuid } from 'uuid';

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

@Module({
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
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('POSTGRES_HOST', 'localhost'),
        port: cfg.get<number>('POSTGRES_PORT', 5432),
        username: cfg.get('POSTGRES_USER', 'studyquest'),
        password: cfg.get('POSTGRES_PASSWORD'),
        database: cfg.get('POSTGRES_DB', 'studyquest'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: cfg.get('TYPEORM_SYNC') === 'true',
        logging: cfg.get('TYPEORM_LOGGING') === 'true',
        extra: { max: 10 },
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) =>
          cb(null, `${uuid()}${extname(file.originalname)}`),
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
  ],
})
export class AppModule {}
