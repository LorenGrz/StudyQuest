import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { StudyBotService } from './study-bot.service';
import { PlayerResult } from '../quests/player-result.entity';
import { AiService } from '../ai/ai.service';

describe('StudyBotService', () => {
  let service: StudyBotService;
  let resultRepo: { find: jest.Mock };
  let aiService: { chat: jest.Mock };

  beforeEach(async () => {
    resultRepo = { find: jest.fn().mockResolvedValue([]) };
    aiService = { chat: jest.fn() };

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
        relations: { quest: { subject: true, questions: true } },
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
});
