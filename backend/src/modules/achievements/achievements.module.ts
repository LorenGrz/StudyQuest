import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from './achievement.entity';
import { UserAchievement } from './user-achievement.entity';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { UsersModule } from '../users/users.module';
import { PartiesModule } from '../parties/parties.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement]),
    UsersModule,
    PartiesModule,
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
