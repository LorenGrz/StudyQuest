import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOperator, Repository } from 'typeorm';
import { QuestRetentionService } from './quest-retention.service';
import { Quest } from './quest.entity';
import { StorageService } from '../storage/storage.service';
import { QuizContentRepository } from './quiz-content/quiz-content.repository';

const NOW = new Date('2026-02-01T00:00:00.000Z');

const cutoffOf = (call: unknown): Date => {
  const where = (call as { where: { createdAt: FindOperator<Date> } }).where;
  return where.createdAt.value;
};

describe('QuestRetentionService', () => {
  let service: QuestRetentionService;
  let questRepo: jest.Mocked<Pick<Repository<Quest>, 'find' | 'delete'>>;
  let storageService: jest.Mocked<
    Pick<StorageService, 'keyFromUrl' | 'deleteMany'>
  >;
  let quizContent: { deleteMany: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.QUEST_RETENTION_DAYS;
    jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());

    quizContent = { deleteMany: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuestRetentionService,
        { provide: QuizContentRepository, useValue: quizContent },
        {
          provide: getRepositoryToken(Quest),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue({ affected: 0 }),
          },
        },
        {
          provide: StorageService,
          useValue: {
            keyFromUrl: jest.fn((url: string | null) =>
              url ? url.replace('/api/v1/files/', '') : null,
            ),
            deleteMany: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(QuestRetentionService);
    questRepo = moduleRef.get(getRepositoryToken(Quest));
    storageService = moduleRef.get(StorageService);
  });

  it('queries with a 30-day cutoff by default and does nothing when nothing expired', async () => {
    await service.purgeExpired();

    expect(questRepo.find).toHaveBeenCalledTimes(1);
    expect(cutoffOf(questRepo.find.mock.calls[0][0]).toISOString()).toBe(
      '2026-01-02T00:00:00.000Z',
    );
    expect(questRepo.delete).not.toHaveBeenCalled();
    expect(storageService.deleteMany).not.toHaveBeenCalled();
    expect(quizContent.deleteMany).not.toHaveBeenCalled();
  });

  it('honours the QUEST_RETENTION_DAYS override', async () => {
    process.env.QUEST_RETENTION_DAYS = '7';

    await service.purgeExpired();

    expect(cutoffOf(questRepo.find.mock.calls[0][0]).toISOString()).toBe(
      '2026-01-25T00:00:00.000Z',
    );
  });

  it('deletes expired quests (cascade) and their S3 objects, skipping nulls', async () => {
    questRepo.find.mockResolvedValue([
      { id: 'q1', sourcePdfUrl: '/api/v1/files/quests/a.pdf' },
      { id: 'q2', sourcePdfUrl: null },
      { id: 'q3', sourcePdfUrl: '/api/v1/files/quests/b.pdf' },
    ] as Quest[]);

    await service.purgeExpired();

    expect(questRepo.delete).toHaveBeenCalledTimes(1);
    expect(storageService.deleteMany).toHaveBeenCalledWith([
      'quests/a.pdf',
      null,
      'quests/b.pdf',
    ]);
    expect(quizContent.deleteMany).toHaveBeenCalledWith(['q1', 'q2', 'q3']);
    expect(questRepo.delete.mock.invocationCallOrder[0]).toBeLessThan(
      quizContent.deleteMany.mock.invocationCallOrder[0],
    );
  });

  it('does not throw when storage cleanup rejects', async () => {
    questRepo.find.mockResolvedValue([
      { id: 'q1', sourcePdfUrl: '/api/v1/files/quests/gone.pdf' },
    ] as Quest[]);
    storageService.deleteMany.mockRejectedValueOnce(new Error('boom'));

    await expect(service.purgeExpired()).resolves.toBeUndefined();
  });

  it('still deletes S3 objects when the DynamoDB purge fails (TTL is the backstop)', async () => {
    questRepo.find.mockResolvedValue([
      { id: 'q1', sourcePdfUrl: '/api/v1/files/quests/a.pdf' },
    ] as Quest[]);
    quizContent.deleteMany.mockRejectedValue(new Error('throttled'));

    await expect(service.purgeExpired()).resolves.toBeUndefined();

    expect(storageService.deleteMany).toHaveBeenCalled();
  });

  it('does not run concurrently with itself', async () => {
    let release!: () => void;
    questRepo.find.mockImplementation(
      () => new Promise((res) => (release = () => res([]))),
    );

    const first = service.purgeExpired();
    const second = service.purgeExpired();
    release();
    await Promise.all([first, second]);

    expect(questRepo.find).toHaveBeenCalledTimes(1);
  });
});
