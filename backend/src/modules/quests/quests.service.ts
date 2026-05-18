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

const XP_CORRECT_BASE = 100;
const XP_SPEED_BONUS = 50;
const XP_SPEED_FAST_MS = 5000;

type QuestAttemptSummary = {
  id: string;
  attemptNumber: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  answeredQuestionIndices: number[];
  currentIndex: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  resumed?: boolean;
  completedAt?: Date | null;
};

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
      relations: ['questions', 'questions.options', 'results', 'results.user'],
    });
    if (!quest) throw new NotFoundException('Quest no encontrado');
    return quest;
  }

  async findByParty(partyId: string, userId: string): Promise<any[]> {
    const quests = await this.questRepo.find({
      where: { partyId },
      relations: ['questions', 'results'],
      order: { createdAt: 'DESC' },
    });

    return quests.map((quest) => {
      const summary = this.buildUserQuestSummary(
        quest.results ?? [],
        userId,
        quest.status,
      );

      return {
        id: quest.id,
        title: quest.title,
        status: quest.status,
        sourcePdfUrl: quest.sourcePdfUrl,
        sourceType: quest.sourcePdfUrl ? 'pdf' : 'text',
        questionCount: quest.questions?.length ?? 0,
        myBestScore: summary.myBestScore,
        myLastScore: summary.myLastScore,
        myStatus: summary.myStatus,
        createdAt: quest.createdAt,
        startedAt: quest.startedAt,
        completedAt: quest.completedAt,
      };
    });
  }

  async getQuestForPlay(questId: string, userId: string): Promise<any> {
    const quest = await this.findById(questId);
    this.assertQuestPlayable(quest);

    const summary = this.buildUserQuestSummary(
      quest.results ?? [],
      userId,
      quest.status,
    );

    return {
      id: quest.id,
      partyId: quest.partyId,
      subjectId: quest.subjectId,
      title: quest.title,
      status: quest.status,
      sourcePdfUrl: quest.sourcePdfUrl,
      questionCount: quest.questions.length,
      myBestScore: summary.myBestScore,
      myLastScore: summary.myLastScore,
      myStatus: summary.myStatus,
      activeAttempt: summary.activeAttempt,
      latestAttempt: summary.latestAttempt,
      leaderboard: this.buildLeaderboard(quest.results ?? [], quest.status),
      questions: quest.questions
        .sort((a, b) => a.position - b.position)
        .map((question) => ({
          id: question.id,
          text: question.text,
          topic: question.topic,
          difficulty: question.difficulty,
          position: question.position,
          options: [...(question.options ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((option) => ({
              id: option.id,
              text: option.text,
              position: option.position,
            })),
        })),
      createdAt: quest.createdAt,
    };
  }

  async startQuest(questId: string, userId: string): Promise<QuestAttemptSummary> {
    const quest = await this.findById(questId);
    this.assertQuestPlayable(quest);

    const activeAttempt = await this.resultRepo.findOne({
      where: { questId, userId, status: 'in_progress' },
      order: { createdAt: 'DESC' },
    });

    if (activeAttempt && this.isStructuredAttempt(activeAttempt)) {
      return this.toAttemptSummary(activeAttempt, true);
    }

    if (activeAttempt && !this.isStructuredAttempt(activeAttempt)) {
      await this.resultRepo.update(activeAttempt.id, { status: 'abandoned' });
    }

    const attempts = await this.resultRepo.find({
      where: { questId, userId },
      order: { attemptNumber: 'DESC' },
    });
    const attemptNumber = (attempts[0]?.attemptNumber ?? 0) + 1;
    const created = await this.resultRepo.save(
      this.resultRepo.create({
        questId,
        userId,
        attemptNumber,
        status: 'in_progress',
        answeredQuestionIndices: [],
        totalQuestions: quest.questions.length,
        score: 0,
        correctAnswers: 0,
        xpEarned: 0,
        totalTimeMs: 0,
      }),
    );

    if (quest.status === 'ready') {
      await this.questRepo.update(questId, {
        status: 'active',
        startedAt: quest.startedAt ?? new Date(),
      });
    }

    return this.toAttemptSummary(created, false);
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

    const attempt = dto.attemptId
      ? await this.resultRepo.findOne({
          where: {
            id: dto.attemptId,
            questId: dto.questId,
            userId,
            status: 'in_progress',
          },
        })
      : await this.resultRepo.findOne({
          where: { questId: dto.questId, userId, status: 'in_progress' },
          order: { createdAt: 'DESC' },
        });

    if (!attempt) {
      throw new BadRequestException('No hay un intento activo para esta quest');
    }

    const answeredQuestionIndices = this.getAnsweredQuestionIndices(attempt);
    if (answeredQuestionIndices.includes(dto.questionIndex)) {
      throw new BadRequestException('Esta pregunta ya fue respondida');
    }

    let newlyUnlockedNodeIds: string[] = [];
    if (isCorrect && question.topic && attempt.attemptNumber === 1) {
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

    await this.resultRepo.update(attempt.id, {
      score: attempt.score + xpEarned,
      correctAnswers: attempt.correctAnswers + (isCorrect ? 1 : 0),
      totalTimeMs: attempt.totalTimeMs + dto.timeSpentMs,
      answeredQuestionIndices: [...answeredQuestionIndices, dto.questionIndex],
    });

    return {
      attemptId: attempt.id,
      isCorrect,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      xpEarned,
      newlyUnlockedNodeIds,
    };
  }

  async completeQuest(questId: string, userId: string): Promise<any> {
    const quest = await this.findById(questId);
    this.assertQuestPlayable(quest);

    const activeAttempt = await this.resultRepo.findOne({
      where: { questId, userId, status: 'in_progress' },
      order: { createdAt: 'DESC' },
    });

    if (!activeAttempt) {
      throw new BadRequestException('No hay un intento activo para completar');
    }

    const answeredQuestionIndices = this.getAnsweredQuestionIndices(activeAttempt);
    const totalQuestions = activeAttempt.totalQuestions || quest.questions.length;
    if (answeredQuestionIndices.length < totalQuestions) {
      throw new BadRequestException(
        'El intento todavía no tiene todas las preguntas respondidas',
      );
    }

    const accuracy =
      totalQuestions > 0 ? activeAttempt.correctAnswers / totalQuestions : 0;
    const bonusXp = Math.floor(accuracy * 200);
    const totalXp = activeAttempt.score + bonusXp;

    await this.resultRepo.update(activeAttempt.id, {
      xpEarned: totalXp,
      status: 'completed',
      completedAt: new Date(),
      totalQuestions,
    });

    if (activeAttempt.attemptNumber === 1) {
      await this.usersService.addXp(userId, totalXp);
      await this.usersService.updateStreak(userId);
    }

    if (quest.status !== 'completed') {
      await this.questRepo.update(questId, {
        status: 'completed',
        completedAt: quest.completedAt ?? new Date(),
      });
    }

    this.eventEmitter.emit('quest.completed', {
      questId,
      userId,
      attemptId: activeAttempt.id,
    });
    return this.getQuestForPlay(questId, userId);
  }

  private assertQuestPlayable(quest: Quest) {
    if (['generating', 'failed'].includes(quest.status)) {
      throw new BadRequestException(
        `Quest no disponible (estado: ${quest.status})`,
      );
    }
  }

  private getAnsweredQuestionIndices(result: PlayerResult): number[] {
    if (!Array.isArray(result.answeredQuestionIndices)) {
      return [];
    }

    return result.answeredQuestionIndices
      .filter((value): value is number => Number.isInteger(value))
      .sort((a, b) => a - b);
  }

  private toAttemptSummary(
    result: PlayerResult,
    resumed: boolean,
  ): QuestAttemptSummary {
    const answeredQuestionIndices = this.getAnsweredQuestionIndices(result);

    return {
      id: result.id,
      attemptNumber: result.attemptNumber,
      status: result.status,
      answeredQuestionIndices,
      currentIndex: answeredQuestionIndices.length,
      score: result.score,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      resumed,
      completedAt: result.completedAt,
    };
  }

  private buildUserQuestSummary(
    results: PlayerResult[],
    userId: string,
    questStatus: Quest['status'],
  ) {
    const myAttempts = results
      .filter((result) => result.userId === userId)
      .filter(
        (result) =>
          this.isStructuredAttempt(result) ||
          this.isLegacyCompletedAttempt(result, questStatus),
      )
      .sort((a, b) => {
        const aTime = new Date(a.completedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.completedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      });

    const activeAttempt = myAttempts.find(
      (attempt) =>
        this.isStructuredAttempt(attempt) && attempt.status === 'in_progress',
    );
    const completedAttempts = myAttempts.filter(
      (attempt) =>
        attempt.status === 'completed' ||
        this.isLegacyCompletedAttempt(attempt, questStatus),
    );
    const latestCompletedAttempt = completedAttempts[0];

    return {
      myBestScore: completedAttempts.length
        ? Math.max(...completedAttempts.map((attempt) => attempt.score))
        : null,
      myLastScore: latestCompletedAttempt?.score ?? null,
      myStatus: activeAttempt
        ? 'in_progress'
        : completedAttempts.length
          ? 'completed'
          : 'never_started',
      activeAttempt: activeAttempt
        ? this.toAttemptSummary(activeAttempt, true)
        : null,
      latestAttempt: latestCompletedAttempt
        ? this.toAttemptSummary(latestCompletedAttempt, false)
        : null,
    };
  }

  private buildLeaderboard(results: PlayerResult[], questStatus: Quest['status']) {
    const bestByUser = new Map<
      string,
      { userId: string; username: string; score: number }
    >();

    for (const result of results) {
      if (
        result.status !== 'completed' &&
        !this.isLegacyCompletedAttempt(result, questStatus)
      ) {
        continue;
      }
      const existing = bestByUser.get(result.userId);
      const username =
        result.user?.displayName ??
        result.user?.username ??
        result.userId;

      if (!existing || result.score > existing.score) {
        bestByUser.set(result.userId, {
          userId: result.userId,
          username,
          score: result.score,
        });
      }
    }

    return [...bestByUser.values()].sort((a, b) => b.score - a.score);
  }

  private isStructuredAttempt(result: PlayerResult): boolean {
    return (
      result.totalQuestions > 0 &&
      Array.isArray(result.answeredQuestionIndices)
    );
  }

  private isLegacyCompletedAttempt(
    result: PlayerResult,
    questStatus: Quest['status'],
  ): boolean {
    return (
      !this.isStructuredAttempt(result) &&
      questStatus === 'completed' &&
      (result.score > 0 || result.correctAnswers > 0)
    );
  }
}
