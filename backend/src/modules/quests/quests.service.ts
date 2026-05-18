import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
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
import { SkillTreeService } from '../skill-tree/skill-tree.service';
import { CreateQuestDto, SubmitAnswerDto } from '../../common/dto';
import { calculateEloDeltas, DEFAULT_ELO } from '../../common/leagues';

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
    private readonly skillTreeService: SkillTreeService,
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

    const pdfBuffer = await this.resolvePdfBuffer(file);

    const quest = await this.questRepo.save(
      this.questRepo.create({
        title: dto.title,
        partyId: dto.partyId,
        subjectId: party.subjectId as string,
        createdBy: userId,
        status: 'generating',
        sourcePdfUrl: file ? `/uploads/${this.resolveUploadedFilename(file)}` : null,
      }),
    );

    this.generateInBackground(quest.id, dto.textContent, pdfBuffer, dto.title).catch(
      (err) =>
        this.logger.error(`Fallo generación quest ${quest.id}: ${err.message}`),
    );

    return quest;
  }

  private async generateInBackground(
    questId: string,
    textContent?: string,
    pdfBuffer?: Buffer,
    questTitle?: string,
  ): Promise<void> {
    try {
      const generationOptions = {
        metadata: {
          questTitle,
          sourceType: pdfBuffer ? ('pdf' as const) : ('text' as const),
        },
      };
      const rawQuestions = pdfBuffer
        ? await this.aiService.generateQuestionsFromPdf(
            pdfBuffer,
            generationOptions,
          )
        : await this.aiService.generateQuestionsFromText(
            textContent!,
            generationOptions,
          );

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

  private async resolvePdfBuffer(
    file?: Express.Multer.File,
  ): Promise<Buffer | undefined> {
    if (!file) return undefined;
    if (file.buffer) return file.buffer;
    if (file.path) return readFile(file.path);
    return undefined;
  }

  private resolveUploadedFilename(file: Express.Multer.File): string {
    if (file.filename) return file.filename;
    if (file.path) return basename(file.path);
    if (file.originalname) return file.originalname;
    return 'upload.bin';
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
        'sourcePdfUrl',
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
        'q.subjectId',
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
      select: ['id', 'correctIndex', 'explanation', 'topic'],
    });
    if (!question) throw new BadRequestException('Pregunta inválida');

    const isCorrect = question.correctIndex === dto.selectedOption;
    const xpEarned = isCorrect
      ? XP_CORRECT_BASE +
        (dto.timeSpentMs < XP_SPEED_FAST_MS ? XP_SPEED_BONUS : 0)
      : 0;

    let newlyUnlockedNodeIds: string[] = [];
    if (isCorrect && question.topic) {
      const quest = await this.questRepo.findOne({
        where: { id: dto.questId },
        select: ['id', 'subjectId'],
      });

      if (quest?.subjectId) {
        newlyUnlockedNodeIds = await this.skillTreeService.awardTopicXp(
          userId,
          quest.subjectId,
          question.topic,
          xpEarned,
        );
      }
    }

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
      newlyUnlockedNodeIds,
    };
  }

  async completeQuest(questId: string): Promise<Quest> {
    const quest = await this.findById(questId);
    if (quest.status !== 'active') {
      throw new BadRequestException('El quest no está activo');
    }

    const totalQuestions = quest.questions.length;

    // Fetch current ELO for all players in parallel
    const playerElos = await Promise.all(
      quest.results.map(async (result) => ({
        userId: result.userId,
        elo: await this.usersService.getElo(result.userId),
        score: result.score,
      })),
    );

    // Calculate ELO deltas based on quiz scores
    const eloDeltas =
      playerElos.length > 1 ? calculateEloDeltas(playerElos) : new Map<string, number>();

    await Promise.all(
      quest.results.map(async (result) => {
        const accuracy = result.correctAnswers / totalQuestions;
        const bonusXp = Math.floor(accuracy * 200);
        const totalXp = result.score + bonusXp;

        await this.resultRepo.update(result.id, { xpEarned: totalXp });
        await this.usersService.addXp(result.userId, totalXp);
        await this.usersService.updateStreak(result.userId);

        const eloDelta = eloDeltas.get(result.userId) ?? 0;
        if (eloDelta !== 0) {
          await this.usersService.updateElo(result.userId, eloDelta);
        }
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
      eloDeltas: Object.fromEntries(eloDeltas),
    });
    return completed;
  }
}
