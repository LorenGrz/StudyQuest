import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quest } from './quest.entity';
import { PlayerResult } from './player-result.entity';
import { QuestsService } from './quests.service';
import { QuestRetentionService } from './quest-retention.service';
import { QuestsController } from './quests.controller';
import { QuizContentModule } from './quiz-content/quiz-content.module';
import { AiModule } from '../ai/ai.module';
import { PartiesModule } from '../parties/parties.module';
import { UsersModule } from '../users/users.module';
import { SkillTreeModule } from '../skill-tree/skill-tree.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quest, PlayerResult]),
    QuizContentModule,
    AiModule,
    PartiesModule,
    UsersModule,
    SkillTreeModule,
    BillingModule,
  ],
  controllers: [QuestsController],
  providers: [QuestsService, QuestRetentionService],
  exports: [QuestsService, QuizContentModule],
})
export class QuestsModule {}
