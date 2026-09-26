import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { StudyBotService } from './study-bot.service';
import { PlayerResult } from '../quests/player-result.entity';
import { AiService } from '../ai/ai.service';
import { QuizContentRepository } from '../quests/quiz-content/quiz-content.repository';
import { InMemoryQuizContentRepository } from '../quests/quiz-content/in-memory-quiz-content.repository';
import { buildQuizContentDoc } from '../quests/quiz-content/quiz-content.utils';

describe('StudyBotService', () => {
  let service: StudyBotService;
  let resultRepo: { find: jest.Mock };
  let aiService: { chat: jest.Mock };
  let quizContent: InMemoryQuizContentRepository;

  beforeEach(async () => {
    resultRepo = { find: jest.fn().mockResolvedValue([]) };
    aiService = { chat: jest.fn() };
    quizContent = new InMemoryQuizContentRepository();

    const moduleRef = await Test.createTestingModule({
      providers: [
        StudyBotService,
        { provide: getRepositoryToken(PlayerResult), useValue: resultRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultValue?: string) => defaultValue),
          },
        },
        { provide: AiService, useValue: aiService },
        { provide: QuizContentRepository, useValue: quizContent },
      ],
    }).compile();

    service = moduleRef.get(StudyBotService);
  });

  it('scopes the history query to the caller and their completed quests', async () => {
    jest.spyOn(service as any, 'callModel').mockResolvedValue('respuesta');

    await service.ask('u1', '¿En qué materia vengo flojo?');

    expect(resultRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', status: 'completed' },
        order: { completedAt: 'DESC' },
        take: 5,
        relations: { quest: { subject: true } },
      }),
    );
  });

  it('feeds the formatted history and the question to the model', async () => {
    resultRepo.find.mockResolvedValue([]);
    const callModel = jest
      .spyOn(service as any, 'callModel')
      .mockResolvedValue('andás bien en Física');

    const result = await service.ask('u1', '¿Cómo voy?');

    expect(callModel).toHaveBeenCalledWith(
      '¿Cómo voy?',
      'El usuario todavía no completó ningún quest.',
    );
    expect(result).toEqual({ answer: 'andás bien en Física' });
  });

  it('answers via aiService.chat using the configured study bot model', async () => {
    resultRepo.find.mockResolvedValue([]);
    aiService.chat.mockResolvedValue('  respuesta del modelo  ');

    const result = await service.ask('u1', '¿Cómo voy?');

    expect(aiService.chat).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('¿Cómo voy?'),
      expect.objectContaining({
        model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      }),
    );
    expect(result).toEqual({ answer: 'respuesta del modelo' });
  });

  it('grounds the context in question text read from the quiz-content store', async () => {
    await quizContent.save(
      buildQuizContentDoc('quest-1', [
        {
          text: '¿Qué es la entropía?',
          options: ['a', 'b'],
          correctIndex: 0,
          explanation: 'Medida del desorden',
          topic: 'Termodinámica',
          difficulty: 'medium',
        },
      ]),
    );
    resultRepo.find.mockResolvedValue([
      {
        questId: 'quest-1',
        correctAnswers: 1,
        totalQuestions: 1,
        completedAt: new Date('2026-05-01T00:00:00Z'),
        quest: { title: 'Física I', subject: { name: 'Física' } },
      },
      {
        questId: 'quest-gone',
        correctAnswers: 0,
        totalQuestions: 2,
        completedAt: new Date('2026-05-02T00:00:00Z'),
        quest: { title: 'Sin contenido', subject: null },
      },
    ]);
    const batchGet = jest.spyOn(quizContent, 'batchGet');
    const callModel = jest
      .spyOn(service as any, 'callModel')
      .mockResolvedValue('ok');

    await service.ask('u1', '¿Qué repaso?');

    expect(batchGet).toHaveBeenCalledWith(['quest-1', 'quest-gone']);
    const context = callModel.mock.calls[0][1] as string;
    expect(context).toContain(
      '[Termodinámica] ¿Qué es la entropía? → Medida del desorden',
    );
    expect(context).toContain('Quest "Sin contenido"');
  });
});
