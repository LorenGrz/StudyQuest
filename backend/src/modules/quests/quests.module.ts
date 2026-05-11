import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quest } from './quest.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizOption } from './quiz-option.entity';
import { PlayerResult } from './player-result.entity';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';
import { AiModule } from '../ai/ai.module';
import { PartiesModule } from '../parties/parties.module';
import { UsersModule } from '../users/users.module';
import { SkillTreeModule } from '../skill-tree/skill-tree.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quest, QuizQuestion, QuizOption, PlayerResult]),
    AiModule,
    PartiesModule,
    UsersModule,
    SkillTreeModule,
  ],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
