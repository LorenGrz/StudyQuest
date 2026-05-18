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
import { PartiesService } from '../parties/parties.service';
import { UsersService } from '../users/users.service';
import { SkillTreeService } from '../skill-tree/skill-tree.service';
import * as fs from 'node:fs/promises';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('QuestsService AI abstraction', () => {
  let service: QuestsService;
  let aiService: jest.Mocked<AiService>;
  let questRepo: jest.Mocked<Repository<Quest>>;
  let partiesService: jest.Mocked<PartiesService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuestsService,
        {
          provide: getRepositoryToken(Quest),
          useValue: {
            save: jest.fn(),
            create: jest.fn((value) => value),
            update: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        { provide: getRepositoryToken(QuizQuestion), useValue: {} },
        { provide: getRepositoryToken(QuizOption), useValue: {} },
        { provide: getRepositoryToken(PlayerResult), useValue: { findOne: jest.fn(), update: jest.fn(), save: jest.fn(), create: jest.fn((value) => value) } },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb: any) =>
              cb({
                create: jest.fn((_entity: unknown, value: unknown) => value),
                save: jest.fn(),
                update: jest.fn(),
              }),
            ),
          },
        },
        {
          provide: AiService,
          useValue: {
            generateQuestionsFromPdf: jest.fn(),
            generateQuestionsFromText: jest.fn(),
          },
        },
        {
          provide: PartiesService,
          useValue: {
            findById: jest.fn(),
            assertMember: jest.fn(),
          },
        },
        { provide: UsersService, useValue: {} },
        { provide: SkillTreeService, useValue: { awardTopicXp: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(QuestsService);
    aiService = moduleRef.get(AiService);
    questRepo = moduleRef.get(getRepositoryToken(Quest));
    partiesService = moduleRef.get(PartiesService);
  });

  it('delegates text generation to the AI facade', async () => {
    (aiService.generateQuestionsFromText as jest.Mock).mockResolvedValue([
      {
        text: 'Pregunta mock?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        explanation: 'Explicacion',
        topic: 'Tema',
        difficulty: 'easy',
      },
    ]);

    await (service as any).generateInBackground(
      'quest-1',
      'texto base',
      undefined,
      'Quest de prueba',
    );

    expect(aiService.generateQuestionsFromText).toHaveBeenCalledWith(
      'texto base',
      expect.objectContaining({
        metadata: expect.objectContaining({
          questTitle: 'Quest de prueba',
          sourceType: 'text',
        }),
      }),
    );
    expect(aiService.generateQuestionsFromPdf).not.toHaveBeenCalled();
  });

  it('delegates pdf generation to the AI facade', async () => {
    const pdfBuffer = Buffer.from('fake pdf');
    (aiService.generateQuestionsFromPdf as jest.Mock).mockResolvedValue([
      {
        text: 'Pregunta pdf?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        explanation: 'Explicacion',
        topic: 'PDF',
        difficulty: 'medium',
      },
    ]);

    await (service as any).generateInBackground(
      'quest-2',
      undefined,
      pdfBuffer,
      'Quest PDF',
    );

    expect(aiService.generateQuestionsFromPdf).toHaveBeenCalledWith(
      pdfBuffer,
      expect.objectContaining({
        metadata: expect.objectContaining({
          questTitle: 'Quest PDF',
          sourceType: 'pdf',
        }),
      }),
    );
    expect(aiService.generateQuestionsFromText).not.toHaveBeenCalled();
  });

  it('reads pdf bytes from disk-backed uploads before delegating to AI', async () => {
    const pdfBuffer = Buffer.from('pdf from disk');
    (fs.readFile as jest.Mock).mockResolvedValue(pdfBuffer);
    partiesService.findById.mockResolvedValue({ subjectId: 'subject-1' } as any);
    questRepo.save.mockResolvedValue({ id: 'quest-3' } as Quest);
    (aiService.generateQuestionsFromPdf as jest.Mock).mockResolvedValue([
      {
        text: 'Pregunta disco?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        explanation: 'Explicacion',
        topic: 'PDF',
        difficulty: 'medium',
      },
    ]);

    await service.createQuest(
      {
        partyId: 'party-1',
        title: 'Quest PDF',
        textContent: undefined,
      },
      'user-1',
      {
        filename: 'quest.pdf',
        path: '/tmp/quest.pdf',
      } as Express.Multer.File,
    );

    await new Promise(process.nextTick);

    expect(fs.readFile).toHaveBeenCalledWith('/tmp/quest.pdf');
    expect(questRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePdfUrl: '/uploads/quest.pdf',
      }),
    );
    expect(aiService.generateQuestionsFromPdf).toHaveBeenCalledWith(
      pdfBuffer,
      expect.objectContaining({
        metadata: expect.objectContaining({
          questTitle: 'Quest PDF',
          sourceType: 'pdf',
        }),
      }),
    );
  });
});
