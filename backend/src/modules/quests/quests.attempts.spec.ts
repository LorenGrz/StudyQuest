import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { QuestsService } from './quests.service';
import { Quest } from './quest.entity';
import { QuizContentRepository } from './quiz-content/quiz-content.repository';
import { InMemoryQuizContentRepository } from './quiz-content/in-memory-quiz-content.repository';
import { buildQuizContentDoc } from './quiz-content/quiz-content.utils';
import {
  calculateSoloEloDelta,
  questRatingFromDifficulties,
} from '../../common/leagues';
import { PlayerResult } from './player-result.entity';
import { AiService } from '../ai/ai.service';
import { MarkitdownService } from '../ai/markitdown.service';
import { PartiesService } from '../parties/parties.service';
import { UsersService } from '../users/users.service';
import { SkillTreeService } from '../skill-tree/skill-tree.service';
import { BillingService } from '../billing/billing.service';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('QuestsService attempts and progress', () => {
  let service: QuestsService;
  let questRepo: jest.Mocked<Repository<Quest>>;
  let quizContent: InMemoryQuizContentRepository;
  let resultRepo: jest.Mocked<Repository<PlayerResult>>;

  const rawQuestion = (
    topic: string,
    difficulty: 'easy' | 'hard' = 'easy',
  ) => ({
    text: `Pregunta ${topic}?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Porque sí',
    topic,
    difficulty,
  });

  const seedContent = (questId: string, count: number) =>
    quizContent.save(
      buildQuizContentDoc(
        questId,
        Array.from({ length: count }, (_, i) => rawQuestion(`T${i}`)),
      ),
    );

  beforeEach(async () => {
    quizContent = new InMemoryQuizContentRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuestsService,
        {
          provide: getRepositoryToken(Quest),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PlayerResult),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findBy: jest.fn(),
            create: jest.fn((value) => value),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: QuizContentRepository, useValue: quizContent },
        {
          provide: AiService,
          useValue: {},
        },
        {
          provide: MarkitdownService,
          useValue: {},
        },
        {
          provide: PartiesService,
          useValue: {},
        },
        {
          provide: UsersService,
          useValue: {
            addXp: jest.fn(),
            updateStreak: jest.fn(),
            getElo: jest.fn(),
            updateElo: jest.fn(),
          },
        },
        {
          provide: SkillTreeService,
          useValue: {
            awardTopicXp: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: BillingService,
          useValue: {
            getLimits: jest.fn().mockReturnValue({
              questsPerDay: 20,
              maxUploadMb: 10,
              maxInstructionsChars: 500,
              aiModelTier: 'lite',
              partySizeMax: 6,
            }),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(QuestsService);
    questRepo = moduleRef.get(getRepositoryToken(Quest));
    resultRepo = moduleRef.get(getRepositoryToken(PlayerResult));
  });

  it('reuses an in-progress attempt when the user reopens the same quest', async () => {
    await seedContent('quest-1', 2);
    questRepo.findOne.mockResolvedValue({
      id: 'quest-1',
      title: 'Quest',
      status: 'active',
      results: [],
    } as unknown as Quest);
    resultRepo.findOne.mockResolvedValue({
      id: 'attempt-1',
      questId: 'quest-1',
      userId: 'user-1',
      attemptNumber: 1,
      status: 'in_progress',
      answeredQuestionIndices: [0],
      score: 120,
      correctAnswers: 1,
      totalQuestions: 2,
      xpEarned: 0,
      totalTimeMs: 1000,
      createdAt: new Date(),
    } as unknown as PlayerResult);

    const attempt = await service.startQuest('quest-1', 'user-1');

    expect(attempt).toEqual(
      expect.objectContaining({
        id: 'attempt-1',
        resumed: true,
        currentIndex: 1,
      }),
    );
    expect(resultRepo.save).not.toHaveBeenCalled();
  });

  it('creates a new attempt after a previous completed run', async () => {
    await seedContent('quest-1', 3);
    questRepo.findOne.mockResolvedValue({
      id: 'quest-1',
      title: 'Quest',
      status: 'completed',
      results: [],
    } as unknown as Quest);
    resultRepo.findOne.mockResolvedValue(null);
    resultRepo.find.mockResolvedValue([
      {
        id: 'attempt-old',
        questId: 'quest-1',
        userId: 'user-1',
        attemptNumber: 1,
        status: 'completed',
      } as unknown as PlayerResult,
    ]);
    resultRepo.save.mockResolvedValue({
      id: 'attempt-2',
      questId: 'quest-1',
      userId: 'user-1',
      attemptNumber: 2,
      status: 'in_progress',
      answeredQuestionIndices: [],
      totalQuestions: 3,
    } as unknown as PlayerResult);

    const attempt = await service.startQuest('quest-1', 'user-1');

    expect(resultRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        questId: 'quest-1',
        userId: 'user-1',
        attemptNumber: 2,
        status: 'in_progress',
        totalQuestions: 3,
      }),
    );
    expect(attempt).toEqual(
      expect.objectContaining({
        id: 'attempt-2',
        resumed: false,
        currentIndex: 0,
      }),
    );
  });

  it('returns question count and user score summary in the party quest list', async () => {
    questRepo.find.mockResolvedValue([
      {
        id: 'quest-1',
        title: 'Transacciones ACID',
        status: 'completed',
        sourcePdfUrl: null,
        createdAt: new Date('2026-05-18T10:00:00Z'),
        questionCount: 3,
        results: [
          {
            userId: 'user-1',
            status: 'completed',
            score: 450,
            createdAt: new Date('2026-05-18T10:10:00Z'),
          },
          {
            userId: 'user-1',
            status: 'in_progress',
            score: 120,
            answeredQuestionIndices: [0],
            totalQuestions: 3,
            createdAt: new Date('2026-05-18T10:20:00Z'),
          },
        ],
      } as unknown as Quest,
    ]);

    const quests = await service.findByParty('party-1', 'user-1');

    expect(quests).toEqual([
      expect.objectContaining({
        id: 'quest-1',
        questionCount: 3,
        myBestScore: 450,
        myLastScore: 450,
        myStatus: 'in_progress',
      }),
    ]);
  });

  it('stores progress on the active attempt when answering', async () => {
    await quizContent.save(
      buildQuizContentDoc('quest-1', [rawQuestion('ACID')]),
    );
    questRepo.findOne.mockResolvedValue({
      id: 'quest-1',
      subjectId: 'subject-1',
    } as unknown as Quest);
    resultRepo.findOne.mockResolvedValue({
      id: 'attempt-1',
      questId: 'quest-1',
      userId: 'user-1',
      attemptNumber: 1,
      status: 'in_progress',
      answeredQuestionIndices: [],
      score: 0,
      correctAnswers: 0,
      totalTimeMs: 0,
      totalQuestions: 2,
      xpEarned: 0,
      createdAt: new Date(),
    } as unknown as PlayerResult);

    await service.submitAnswer(
      {
        questId: 'quest-1',
        attemptId: 'attempt-1',
        questionIndex: 0,
        selectedOption: 0,
        timeSpentMs: 1200,
      },
      'user-1',
    );

    expect(resultRepo.update).toHaveBeenCalledWith(
      'attempt-1',
      expect.objectContaining({
        answeredQuestionIndices: [0],
        correctAnswers: 1,
      }),
    );
  });

  it('serves play questions from the quiz-content document with the same JSON shape', async () => {
    await quizContent.save(
      buildQuizContentDoc('quest-1', [rawQuestion('B'), rawQuestion('A')]),
    );
    const stored = await quizContent.get('quest-1');
    questRepo.findOne.mockResolvedValue({
      id: 'quest-1',
      partyId: 'party-1',
      subjectId: 'subject-1',
      title: 'Quest',
      status: 'ready',
      sourcePdfUrl: null,
      results: [],
      createdAt: new Date(),
    } as unknown as Quest);

    const play = await service.getQuestForPlay('quest-1', 'user-1');

    expect(play.questionCount).toBe(2);
    expect(play.questions).toHaveLength(2);
    const [first] = play.questions;
    expect(Object.keys(first).sort()).toEqual(
      ['difficulty', 'id', 'options', 'position', 'text', 'topic'].sort(),
    );
    expect(first.id).toBe(stored!.questions[0].id);
    expect(first.position).toBe(0);
    expect(first.options).toHaveLength(4);
    expect(Object.keys(first.options[0]).sort()).toEqual(
      ['id', 'position', 'text'].sort(),
    );
    // correctness must never leak to the client
    expect(JSON.stringify(play.questions)).not.toMatch(
      /isCorrect|correctIndex|explanation/,
    );
    const optionIds = play.questions.flatMap((q: any) =>
      q.options.map((o: any) => o.id),
    );
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });

  it('rejects an answer when the quest has no quiz content', async () => {
    await expect(
      service.submitAnswer(
        {
          questId: 'missing',
          questionIndex: 0,
          selectedOption: 0,
          timeSpentMs: 100,
        },
        'user-1',
      ),
    ).rejects.toThrow('Pregunta inválida');
    expect(resultRepo.update).not.toHaveBeenCalled();
  });

  it('rates a first completion using the difficulties stored in the document', async () => {
    await quizContent.save(
      buildQuizContentDoc('quest-1', [
        rawQuestion('A', 'hard'),
        rawQuestion('B', 'hard'),
      ]),
    );
    questRepo.findOne.mockResolvedValue({
      id: 'quest-1',
      status: 'active',
      results: [],
      createdAt: new Date(),
    } as unknown as Quest);
    resultRepo.findOne.mockResolvedValue({
      id: 'attempt-1',
      attemptNumber: 1,
      status: 'in_progress',
      answeredQuestionIndices: [0, 1],
      score: 200,
      correctAnswers: 2,
      totalQuestions: 2,
      createdAt: new Date(),
    } as unknown as PlayerResult);
    const usersService = (service as any).usersService;
    usersService.getElo.mockResolvedValue(1000);

    await service.completeQuest('quest-1', 'user-1');

    expect(usersService.updateElo).toHaveBeenCalledWith(
      'user-1',
      calculateSoloEloDelta(
        1000,
        1,
        questRatingFromDifficulties(['hard', 'hard']),
      ),
    );
    expect(resultRepo.update).toHaveBeenCalledWith(
      'attempt-1',
      expect.objectContaining({ status: 'completed', totalQuestions: 2 }),
    );
  });
});
