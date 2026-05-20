import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from './achievement.entity';
import { UserAchievement } from './user-achievement.entity';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { UsersModule } from '../users/users.module';
import { PartiesModule } from '../parties/parties.module';
import { UserTitle } from '../cosmetics/user-title.entity';
import { UserInventory } from '../cosmetics/user-inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Achievement,
      UserAchievement,
      UserTitle,
      UserInventory,
    ]),
    UsersModule,
    PartiesModule,
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
