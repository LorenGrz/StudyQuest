import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Quest } from './quest.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizOption } from './quiz-option.entity';
import { PlayerResult } from './player-result.entity';
import { AiService } from '../ai/ai.service';
import { PartiesService } from '../parties/parties.service';
import { UsersService } from '../users/users.service';
import { CreateQuestDto, SubmitAnswerDto } from '../../common/dto';

const XP_CORRECT_BASE = 100;
const XP_SPEED_BONUS = 50;
const XP_SPEED_FAST_MS = 5000;

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    @InjectRepository(Quest)
    private readonly questRepo: Repository<Quest>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizOption)
    private readonly optionRepo: Repository<QuizOption>,
    @InjectRepository(PlayerResult)
    private readonly resultRepo: Repository<PlayerResult>,
    private readonly dataSource: DataSource,
    private readonly aiService: AiService,
    private readonly partiesService: PartiesService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createQuest(
    dto: CreateQuestDto,
    userId: string,
    file?: Express.Multer.File,
  ): Promise<Quest> {
    const party = await this.partiesService.findById(dto.partyId);
    this.partiesService.assertMember(party, userId);

    if (!dto.textContent && !file) {
      throw new BadRequestException('Debés proporcionar texto o un PDF');
    }

    const quest = await this.questRepo.save(
      this.questRepo.create({
        title: dto.title,
        partyId: dto.partyId,
        subjectId: party.subjectId as string,
        createdBy: userId,
        status: 'generating',
        sourcePdfUrl: file ? `/uploads/${file.filename}` : null,
      }),
    );

    this.generateInBackground(quest.id, dto.textContent, file?.buffer).catch(
      (err) =>
        this.logger.error(`Fallo generación quest ${quest.id}: ${err.message}`),
    );

    return quest;
  }

  private async generateInBackground(
    questId: string,
    textContent?: string,
    pdfBuffer?: Buffer,
  ): Promise<void> {
    try {
      const rawQuestions = pdfBuffer
        ? await this.aiService.generateQuestionsFromPdf(pdfBuffer)
        : await this.aiService.generateQuestionsFromText(textContent!);

      await this.dataSource.transaction(async (em) => {
        for (let i = 0; i < rawQuestions.length; i++) {
          const raw = rawQuestions[i];

          const question = em.create(QuizQuestion, {
            questId,
            position: i,
            text: raw.text,
            correctIndex: raw.correctIndex,
            explanation: raw.explanation,
            topic: raw.topic,
            difficulty: raw.difficulty,
          });
          await em.save(question);

          const options = raw.options.map((optText: string, j: number) =>
            em.create(QuizOption, {
              questionId: question.id,
              position: j,
              text: optText,
              isCorrect: j === raw.correctIndex,
            }),
          );
          await em.save(options);
        }

        await em.update(Quest, questId, { status: 'ready' });
      });

      this.eventEmitter.emit('quest.ready', { questId });
      this.logger.log(
        `Quest ${questId}: ${rawQuestions.length} preguntas generadas`,
      );
    } catch (err) {
      await this.questRepo.update(questId, {
        status: 'failed',
        errorMessage: err.message,
      });
      this.eventEmitter.emit('quest.failed', { questId, error: err.message });
    }
  }

  async findById(id: string): Promise<Quest> {
    const quest = await this.questRepo.findOne({
      where: { id },
      relations: ['questions', 'questions.options', 'results'],
    });
    if (!quest) throw new NotFoundException('Quest no encontrado');
    return quest;
  }

  async findByParty(partyId: string): Promise<Quest[]> {
    return this.questRepo.find({
      where: { partyId },
      select: [
        'id',
        'title',
        'status',
        'createdAt',
        'startedAt',
        'completedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getQuestForPlay(questId: string): Promise<any> {
    const quest = await this.questRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.questions', 'qq')
      .leftJoinAndSelect('qq.options', 'o')
      .where('q.id = :id', { id: questId })
      .select([
        'q.id',
        'q.title',
        'q.status',
        'q.startedAt',
        'qq.id',
        'qq.text',
        'qq.topic',
        'qq.difficulty',
        'qq.position',
        'o.id',
        'o.text',
        'o.position',
      ])
      .orderBy('qq.position', 'ASC')
      .addOrderBy('o.position', 'ASC')
      .getOne();

    if (!quest) throw new NotFoundException('Quest no encontrado');
    if (!['ready', 'active'].includes(quest.status)) {
      throw new BadRequestException(
        `Quest no disponible (estado: ${quest.status})`,
      );
    }
    return quest;
  }

  async startQuest(questId: string): Promise<Quest> {
    const quest = await this.findById(questId);
    if (quest.status !== 'ready') {
      throw new BadRequestException('El quest no está listo');
    }
    await this.questRepo.update(questId, {
      status: 'active',
      startedAt: new Date(),
    });
    return { ...quest, status: 'active' } as Quest;
  }

  async submitAnswer(dto: SubmitAnswerDto, userId: string) {
    const question = await this.questionRepo.findOne({
      where: { questId: dto.questId, position: dto.questionIndex },
      select: ['id', 'correctIndex', 'explanation'],
    });
    if (!question) throw new BadRequestException('Pregunta inválida');

    const isCorrect = question.correctIndex === dto.selectedOption;
    const xpEarned = isCorrect
      ? XP_CORRECT_BASE +
        (dto.timeSpentMs < XP_SPEED_FAST_MS ? XP_SPEED_BONUS : 0)
      : 0;

    const existing = await this.resultRepo.findOne({
      where: { questId: dto.questId, userId },
    });

    if (existing) {
      await this.resultRepo.update(existing.id, {
        score: existing.score + xpEarned,
        correctAnswers: existing.correctAnswers + (isCorrect ? 1 : 0),
        totalTimeMs: existing.totalTimeMs + dto.timeSpentMs,
      });
    } else {
      await this.resultRepo.save(
        this.resultRepo.create({
          questId: dto.questId,
          userId,
          score: xpEarned,
          correctAnswers: isCorrect ? 1 : 0,
          totalTimeMs: dto.timeSpentMs,
        }),
      );
    }

    return {
      isCorrect,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      xpEarned,
    };
  }

  async completeQuest(questId: string): Promise<Quest> {
    const quest = await this.findById(questId);
    if (quest.status !== 'active') {
      throw new BadRequestException('El quest no está activo');
    }

    const totalQuestions = quest.questions.length;

    await Promise.all(
      quest.results.map(async (result) => {
        const accuracy = result.correctAnswers / totalQuestions;
        const bonusXp = Math.floor(accuracy * 200);
        const totalXp = result.score + bonusXp;

        await this.resultRepo.update(result.id, { xpEarned: totalXp });
        await this.usersService.addXp(result.userId, totalXp);
        await this.usersService.updateStreak(result.userId);
      }),
    );

    await this.questRepo.update(questId, {
      status: 'completed',
      completedAt: new Date(),
    });

    const completed = await this.findById(questId);
    this.eventEmitter.emit('quest.completed', {
      questId,
      results: completed.results,
    });
    return completed;
  }
}
