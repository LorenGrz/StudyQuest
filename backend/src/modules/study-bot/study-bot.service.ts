import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    const apiKey = this.cfg.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Falta GEMINI_API_KEY para usar el bot de estudio',
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: this.cfg.get(
        'STUDY_BOT_MODEL',
        this.cfg.get('GEMINI_MODEL', 'gemini-flash-lite-latest'),
      ),
      // Rules go in systemInstruction; the (indirectly user-influenced) quest
      // history is sent as content between delimiter tags so the model can
      // tell it apart from instructions — same pattern as quiz-prompt.ts.
      systemInstruction: STUDY_BOT_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: Number(this.cfg.get('AI_MAX_OUTPUT_TOKENS', 1024)),
      },
    });

    try {
      const result = await model.generateContent(
        buildStudyBotUserPrompt(question, context),
      );
      const text = result.response.text()?.trim();
      if (!text) {
        throw new InternalServerErrorException(
          'El bot de estudio no generó respuesta',
        );
      }
      return text;
    } catch (err) {
      this.logger.error(
        `Error consultando al bot de estudio: ${(err as Error)?.message}`,
      );
      throw err;
    }
  }
}
