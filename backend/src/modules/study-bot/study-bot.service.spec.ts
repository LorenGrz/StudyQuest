import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { StudyBotService } from './study-bot.service';
import { PlayerResult } from '../quests/player-result.entity';

describe('StudyBotService', () => {
  let service: StudyBotService;
  let resultRepo: { find: jest.Mock };

  beforeEach(async () => {
    resultRepo = { find: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StudyBotService,
        { provide: getRepositoryToken(PlayerResult), useValue: resultRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
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
});
