import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { QuestsService } from './quests.service';
import { Quest } from './quest.entity';
import { QuizContentRepository } from './quiz-content/quiz-content.repository';
import { InMemoryQuizContentRepository } from './quiz-content/in-memory-quiz-content.repository';
import { PlayerResult } from './player-result.entity';
import { AiService } from '../ai/ai.service';
import { MarkitdownService } from '../ai/markitdown.service';
import { PartiesService } from '../parties/parties.service';
import { UsersService } from '../users/users.service';
import { SkillTreeService } from '../skill-tree/skill-tree.service';
import { BillingService } from '../billing/billing.service';
import * as fs from 'node:fs/promises';

const FREE_LIMITS = {
  questsPerDay: 20,
  maxUploadMb: 10,
  maxInstructionsChars: 500,
  aiModelTier: 'lite' as const,
  partySizeMax: 6,
  studyBotEnabled: false,
};

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
  let billingService: jest.Mocked<BillingService>;
  let quizContent: InMemoryQuizContentRepository;

  beforeEach(async () => {
    quizContent = new InMemoryQuizContentRepository();
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
        {
          provide: getRepositoryToken(PlayerResult),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
            create: jest.fn((value) => value),
          },
        },
        { provide: QuizContentRepository, useValue: quizContent },
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
        {
          provide: UsersService,
          useValue: {
            findById: jest
              .fn()
              .mockResolvedValue({ plan: 'free', planExpiresAt: null }),
          },
        },
        {
          provide: BillingService,
          useValue: { getLimits: jest.fn().mockReturnValue(FREE_LIMITS) },
        },
        { provide: SkillTreeService, useValue: { awardTopicXp: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(QuestsService);
    aiService = moduleRef.get(AiService);
    markitdownService = moduleRef.get(MarkitdownService);
    questRepo = moduleRef.get(getRepositoryToken(Quest));
    partiesService = moduleRef.get(PartiesService);
    billingService = moduleRef.get(BillingService);
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

  it('enforces the daily quest cap from the user plan limits', async () => {
    partiesService.findById.mockResolvedValue({
      subjectId: 'subject-1',
    } as any);
    billingService.getLimits.mockReturnValue({
      ...FREE_LIMITS,
      questsPerDay: 3,
    });
    (questRepo.count as jest.Mock).mockResolvedValue(3);

    await expect(
      service.createQuest(
        { partyId: 'party-1', title: 'Quest de más' },
        'user-1',
        {
          originalname: 'quest.pdf',
          buffer: PDF_BYTES,
        } as Express.Multer.File,
      ),
    ).rejects.toThrow(/límite diario/i);
  });

  it('uses the stronger model for a pro plan', async () => {
    partiesService.findById.mockResolvedValue({
      subjectId: 'subject-1',
    } as any);
    billingService.getLimits.mockReturnValue({
      ...FREE_LIMITS,
      aiModelTier: 'full',
    });
    questRepo.save.mockResolvedValue({ id: 'quest-pro' } as Quest);
    markitdownService.toMarkdown.mockResolvedValue('# Apunte\n'.repeat(40));
    (aiService.generateQuestionsFromText as jest.Mock).mockResolvedValue([
      rawQuestion,
    ]);

    await service.createQuest(
      { partyId: 'party-1', title: 'Quest Pro' },
      'user-1',
      { originalname: 'quest.pdf', buffer: PDF_BYTES } as Express.Multer.File,
    );
    await new Promise(process.nextTick);

    expect(aiService.generateQuestionsFromText).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: expect.stringContaining('gemini') }),
    );
  });

  describe('quiz content storage (DynamoDB document)', () => {
    const generate = (questId: string) =>
      (service as any).generateInBackground(questId, {
        sourceBuffer: Buffer.from('texto plano'),
        filename: 'apunte.txt',
        instructions: null,
      });

    beforeEach(() => {
      markitdownService.toMarkdown.mockResolvedValue('# Apunte\n'.repeat(40));
      (aiService.generateQuestionsFromText as jest.Mock).mockResolvedValue([
        rawQuestion,
        { ...rawQuestion, text: 'Otra?', correctIndex: 2 },
      ]);
    });

    it('writes the document before marking the quest ready with its questionCount', async () => {
      const order: string[] = [];
      jest.spyOn(quizContent, 'save').mockImplementation(async (doc) => {
        order.push('dynamo.put');
        await InMemoryQuizContentRepository.prototype.save.call(
          quizContent,
          doc,
        );
      });
      questRepo.update.mockImplementation(async () => {
        order.push('pg.update');
        return {} as any;
      });

      await generate('quest-doc');

      expect(order).toEqual(['dynamo.put', 'pg.update']);
      expect(questRepo.update).toHaveBeenCalledWith('quest-doc', {
        questionCount: 2,
        status: 'ready',
      });
      const doc = await quizContent.get('quest-doc');
      expect(doc).toEqual(
        expect.objectContaining({ questId: 'quest-doc', questionCount: 2 }),
      );
      expect(doc!.questions[1]).toEqual(
        expect.objectContaining({
          position: 1,
          text: 'Otra?',
          correctIndex: 2,
          id: expect.any(String),
        }),
      );
      expect(doc!.questions[1].options.map((o) => o.isCorrect)).toEqual([
        false,
        false,
        true,
        false,
      ]);
    });

    it('marks the quest failed (and never ready) when the DynamoDB put fails', async () => {
      jest
        .spyOn(quizContent, 'save')
        .mockRejectedValue(new Error('ProvisionedThroughputExceeded'));

      await generate('quest-put-fail');

      expect(questRepo.update).toHaveBeenCalledTimes(1);
      expect(questRepo.update).toHaveBeenCalledWith('quest-put-fail', {
        status: 'failed',
        errorMessage: 'ProvisionedThroughputExceeded',
      });
    });

    it('drops the orphan document when the Postgres update fails after the put', async () => {
      questRepo.update
        .mockRejectedValueOnce(new Error('pg down'))
        .mockResolvedValueOnce({} as any);

      await generate('quest-pg-fail');

      expect(await quizContent.get('quest-pg-fail')).toBeNull();
      expect(questRepo.update).toHaveBeenLastCalledWith('quest-pg-fail', {
        status: 'failed',
        errorMessage: 'pg down',
      });
    });

    it('deletes the DynamoDB document when a quest is deleted', async () => {
      await generate('quest-del');
      expect(await quizContent.get('quest-del')).not.toBeNull();
      const remove = jest.fn();
      (questRepo as any).remove = remove;
      questRepo.findOne.mockResolvedValue({
        id: 'quest-del',
        partyId: 'party-1',
      } as Quest);
      partiesService.findById.mockResolvedValue({ id: 'party-1' } as any);

      await service.deleteQuest('quest-del', 'user-1');

      expect(remove).toHaveBeenCalled();
      expect(await quizContent.get('quest-del')).toBeNull();
    });

    it('reports questionCount from the Postgres column in the party list', async () => {
      questRepo.find.mockResolvedValue([
        {
          id: 'quest-1',
          title: 'Q',
          status: 'ready',
          questionCount: 7,
          results: [],
          createdAt: new Date(),
        } as unknown as Quest,
      ]);

      const [quest] = await service.findByParty('party-1', 'user-1');

      expect(quest.questionCount).toBe(7);
      expect(questRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['results'] }),
      );
    });
  });
});
