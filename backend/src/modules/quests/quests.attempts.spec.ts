import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { QuestsService } from './quests.service';
import { Quest } from './quest.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizOption } from './quiz-option.entity';
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
  let questionRepo: jest.Mocked<Repository<QuizQuestion>>;
  let resultRepo: jest.Mocked<Repository<PlayerResult>>;

  beforeEach(async () => {
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
          provide: getRepositoryToken(QuizQuestion),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(QuizOption),
          useValue: {},
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
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
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
    questionRepo = moduleRef.get(getRepositoryToken(QuizQuestion));
    resultRepo = moduleRef.get(getRepositoryToken(PlayerResult));
  });

  it('reuses an in-progress attempt when the user reopens the same quest', async () => {
    questRepo.findOne.mockResolvedValue({
      id: 'quest-1',
      title: 'Quest',
      status: 'active',
      questions: [{ id: 'q1' }, { id: 'q2' }] as any,
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
    questRepo.findOne.mockResolvedValue({
      id: 'quest-1',
      title: 'Quest',
      status: 'completed',
      questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }] as any,
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
        questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }] as any,
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
      } as Quest,
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
    questionRepo.findOne.mockResolvedValue({
      id: 'question-1',
      correctIndex: 0,
      explanation: 'Porque sí',
      topic: 'ACID',
    } as unknown as QuizQuestion);
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
});
