import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerResult } from '../quests/player-result.entity';
import { BillingModule } from '../billing/billing.module';
import { StudyBotService } from './study-bot.service';
import { StudyBotController } from './study-bot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerResult]), BillingModule],
  controllers: [StudyBotController],
  providers: [StudyBotService],
})
export class StudyBotModule {}
