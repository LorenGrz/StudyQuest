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
import * as fs from 'node:fs/promises';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

const PDF_BYTES = Buffer.from('%PDF-1.4 contenido de prueba');

describe('QuestsService AI abstraction', () => {
  let service: QuestsService;
  let aiService: jest.Mocked<AiService>;
  let markitdownService: jest.Mocked<MarkitdownService>;
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
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn(),
          },
        },
        { provide: getRepositoryToken(QuizQuestion), useValue: {} },
        { provide: getRepositoryToken(QuizOption), useValue: {} },
        {
          provide: getRepositoryToken(PlayerResult),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
            create: jest.fn((value) => value),
          },
        },
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
          provide: MarkitdownService,
          useValue: {
            toMarkdown: jest.fn(),
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
    markitdownService = moduleRef.get(MarkitdownService);
    questRepo = moduleRef.get(getRepositoryToken(Quest));
    partiesService = moduleRef.get(PartiesService);
  });

  const rawQuestion = {
    text: 'Pregunta mock?',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Explicacion',
    topic: 'Tema',
    difficulty: 'easy',
  };

  it('converts a non-pdf document to markdown via markitdown then delegates to text generation', async () => {
    const docBuffer = Buffer.from('texto plano del apunte');
    const markdown = '# Apunte\n'.repeat(40);
    markitdownService.toMarkdown.mockResolvedValue(markdown);
    (aiService.generateQuestionsFromText as jest.Mock).mockResolvedValue([
      rawQuestion,
    ]);

    await (service as any).generateInBackground('quest-1', {
      sourceBuffer: docBuffer,
      filename: 'apunte.txt',
      instructions: null,
      questTitle: 'Quest de prueba',
    });

    expect(markitdownService.toMarkdown).toHaveBeenCalledWith(
      docBuffer,
      'apunte.txt',
    );
    expect(aiService.generateQuestionsFromText).toHaveBeenCalledWith(
      markdown,
      expect.objectContaining({
        metadata: expect.objectContaining({
          questTitle: 'Quest de prueba',
          sourceType: 'text',
        }),
      }),
    );
    expect(aiService.generateQuestionsFromPdf).not.toHaveBeenCalled();
  });

  it('passes the user instructions through to the AI options', async () => {
    markitdownService.toMarkdown.mockResolvedValue('# Apunte\n'.repeat(40));
    (aiService.generateQuestionsFromText as jest.Mock).mockResolvedValue([
      rawQuestion,
    ]);

    await (service as any).generateInBackground('quest-1b', {
      sourceBuffer: PDF_BYTES,
      filename: 'apunte.pdf',
      instructions: 'solo el capítulo 1, nivel difícil',
      questTitle: 'Quest',
    });

    expect(aiService.generateQuestionsFromText).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        instructions: 'solo el capítulo 1, nivel difícil',
      }),
    );
  });

  it('converts pdf to markdown via markitdown then delegates to text generation', async () => {
    const markdown = '# Apunte\n'.repeat(40);
    markitdownService.toMarkdown.mockResolvedValue(markdown);
    (aiService.generateQuestionsFromText as jest.Mock).mockResolvedValue([
      rawQuestion,
    ]);

    await (service as any).generateInBackground('quest-2', {
      sourceBuffer: PDF_BYTES,
      filename: 'apunte.pdf',
      instructions: null,
      questTitle: 'Quest PDF',
    });

    expect(markitdownService.toMarkdown).toHaveBeenCalledWith(
      PDF_BYTES,
      'apunte.pdf',
    );
    expect(aiService.generateQuestionsFromText).toHaveBeenCalledWith(
      markdown,
      expect.objectContaining({
        metadata: expect.objectContaining({
          questTitle: 'Quest PDF',
          sourceType: 'pdf',
        }),
      }),
    );
    expect(aiService.generateQuestionsFromPdf).not.toHaveBeenCalled();
  });

  it('falls back to native pdf generation when markitdown fails for a pdf', async () => {
    markitdownService.toMarkdown.mockRejectedValue(new Error('sidecar caído'));
    (aiService.generateQuestionsFromPdf as jest.Mock).mockResolvedValue([
      rawQuestion,
    ]);

    await (service as any).generateInBackground('quest-2b', {
      sourceBuffer: PDF_BYTES,
      filename: 'apunte.pdf',
      instructions: null,
      questTitle: 'Quest PDF',
    });

    expect(aiService.generateQuestionsFromPdf).toHaveBeenCalledWith(
      PDF_BYTES,
      expect.objectContaining({
        metadata: expect.objectContaining({ sourceType: 'pdf' }),
      }),
    );
    expect(aiService.generateQuestionsFromText).not.toHaveBeenCalled();
  });

  it('fails the quest when markitdown fails for a non-pdf document (no native fallback)', async () => {
    markitdownService.toMarkdown.mockRejectedValue(new Error('sidecar caído'));

    await (service as any).generateInBackground('quest-2c', {
      sourceBuffer: Buffer.from('un docx que markitdown no pudo leer'),
      filename: 'apunte.docx',
      instructions: null,
      questTitle: 'Quest DOCX',
    });

    expect(aiService.generateQuestionsFromPdf).not.toHaveBeenCalled();
    expect(questRepo.update).toHaveBeenCalledWith(
      'quest-2c',
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('reads the source bytes from disk-backed uploads and stores instructions', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(PDF_BYTES);
    markitdownService.toMarkdown.mockResolvedValue('# Apunte\n'.repeat(40));
    partiesService.findById.mockResolvedValue({
      subjectId: 'subject-1',
    } as any);
    questRepo.save.mockResolvedValue({ id: 'quest-3' } as Quest);
    (aiService.generateQuestionsFromText as jest.Mock).mockResolvedValue([
      rawQuestion,
    ]);

    await service.createQuest(
      {
        partyId: 'party-1',
        title: 'Quest PDF',
        instructions: 'foco en teoría',
      },
      'user-1',
      {
        originalname: 'quest.pdf',
        path: '/tmp/quest.pdf',
      } as Express.Multer.File,
    );

    await new Promise(process.nextTick);

    expect(fs.readFile).toHaveBeenCalledWith('/tmp/quest.pdf');
    expect(questRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePdfUrl: '/uploads/quest.pdf',
        sourceText: 'foco en teoría',
      }),
    );
    expect(markitdownService.toMarkdown).toHaveBeenCalledWith(
      PDF_BYTES,
      'quest.pdf',
    );
    expect(aiService.generateQuestionsFromText).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ instructions: 'foco en teoría' }),
    );
  });

  it('rejects a file whose bytes do not match its extension', async () => {
    partiesService.findById.mockResolvedValue({
      subjectId: 'subject-1',
    } as any);

    await expect(
      service.createQuest(
        { partyId: 'party-1', title: 'Quest falso' },
        'user-1',
        {
          originalname: 'quest.pdf',
          buffer: Buffer.from('<html>no soy un pdf</html>'),
        } as Express.Multer.File,
      ),
    ).rejects.toThrow(/no coincide con su extensión|documento válido/);
  });
});
