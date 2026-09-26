import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { PlayerResult } from '../quests/player-result.entity';
import { formatQuestHistory } from './study-history.utils';
import {
  STUDY_BOT_SYSTEM_PROMPT,
  buildStudyBotUserPrompt,
} from './study-bot-prompt';

/** How many recent completed quests ground the bot's answer. Small on
 * purpose: this is per-account retrieval by SQL, not a vector search, so the
 * "index" is just "the last few things this user did". */
const RECENT_QUESTS_LIMIT = 5;

@Injectable()
export class StudyBotService {
  private readonly logger = new Logger(StudyBotService.name);

  constructor(
    @InjectRepository(PlayerResult)
    private readonly resultRepo: Repository<PlayerResult>,
    private readonly cfg: ConfigService,
    private readonly aiService: AiService,
  ) {}

  async ask(userId: string, question: string): Promise<{ answer: string }> {
    const context = await this.buildContext(userId);
    const answer = await this.callModel(question, context);
    return { answer };
  }

  private async buildContext(userId: string): Promise<string> {
    const results = await this.resultRepo.find({
      where: { userId, status: 'completed' },
      order: { completedAt: 'DESC' },
      take: RECENT_QUESTS_LIMIT,
      relations: { quest: { subject: true, questions: true } },
    });
    return formatQuestHistory(results);
  }

  private async callModel(question: string, context: string): Promise<string> {
    const model = this.cfg.get<string>(
      'STUDY_BOT_MODEL',
      this.cfg.get<string>(
        'BEDROCK_MODEL_PRO',
        'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      ),
    );

    try {
      // Rules go in the system prompt; the (indirectly user-influenced) quest
      // history is sent as content between delimiter tags so the model can
      // tell it apart from instructions — same pattern as quiz-prompt.ts.
      const text = await this.aiService.chat(
        STUDY_BOT_SYSTEM_PROMPT,
        buildStudyBotUserPrompt(question, context),
        {
          model,
          maxTokens: Number(this.cfg.get('AI_MAX_OUTPUT_TOKENS', 1024)),
        },
      );
      const trimmed = text?.trim();
      if (!trimmed) {
        throw new InternalServerErrorException(
          'El bot de estudio no generó respuesta',
        );
      }
      return trimmed;
    } catch (err) {
      this.logger.error(
        `Error consultando al bot de estudio: ${(err as Error)?.message}`,
      );
      throw err;
    }
  }
}
