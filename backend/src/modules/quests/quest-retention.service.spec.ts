import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOperator, Repository } from 'typeorm';
import * as fs from 'node:fs/promises';
import { QuestRetentionService } from './quest-retention.service';
import { Quest } from './quest.entity';

jest.mock('node:fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
}));

const readdirMock = fs.readdir as unknown as jest.Mock;
const statMock = fs.stat as unknown as jest.Mock;
const unlinkMock = fs.unlink as unknown as jest.Mock;

const NOW = new Date('2026-02-01T00:00:00.000Z');

const cutoffOf = (call: unknown): Date => {
  const where = (call as { where: { createdAt: FindOperator<Date> } }).where;
  return where.createdAt.value;
};

describe('QuestRetentionService', () => {
  let service: QuestRetentionService;
  let questRepo: jest.Mocked<Pick<Repository<Quest>, 'find' | 'delete'>>;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.QUEST_RETENTION_DAYS;
    jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());

    readdirMock.mockResolvedValue([]);
    statMock.mockResolvedValue({ mtime: NOW });
    unlinkMock.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuestRetentionService,
        {
          provide: getRepositoryToken(Quest),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue({ affected: 0 }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(QuestRetentionService);
    questRepo = moduleRef.get(getRepositoryToken(Quest));
  });

  it('queries with a 7-day cutoff by default and does nothing when nothing expired', async () => {
    await service.purgeExpired();

    expect(questRepo.find).toHaveBeenCalledTimes(1);
    expect(cutoffOf(questRepo.find.mock.calls[0][0]).toISOString()).toBe(
      '2026-01-25T00:00:00.000Z',
    );
    expect(questRepo.delete).not.toHaveBeenCalled();
  });

  it('honours the QUEST_RETENTION_DAYS override', async () => {
    process.env.QUEST_RETENTION_DAYS = '30';

    await service.purgeExpired();

    expect(cutoffOf(questRepo.find.mock.calls[0][0]).toISOString()).toBe(
      '2026-01-02T00:00:00.000Z',
    );
  });

  it('deletes expired quests (cascade) and unlinks their PDFs, skipping nulls', async () => {
    questRepo.find.mockResolvedValue([
      { id: 'q1', sourcePdfUrl: '/uploads/a.pdf' },
      { id: 'q2', sourcePdfUrl: null },
      { id: 'q3', sourcePdfUrl: '/uploads/b.pdf' },
    ] as Quest[]);

    await service.purgeExpired();

    expect(questRepo.delete).toHaveBeenCalledTimes(1);
    expect(unlinkMock).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[/\\]a\.pdf$/),
    );
    expect(unlinkMock).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[/\\]b\.pdf$/),
    );
    expect(unlinkMock).not.toHaveBeenCalledWith(
      expect.stringContaining('null'),
    );
  });

  it('does not throw when an expired PDF is already gone (ENOENT)', async () => {
    questRepo.find.mockResolvedValue([
      { id: 'q1', sourcePdfUrl: '/uploads/gone.pdf' },
    ] as Quest[]);
    unlinkMock.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'ENOENT' }),
    );

    await expect(service.purgeExpired()).resolves.toBeUndefined();
  });

  it('sweeps loose upload files older than the cutoff, keeps recent ones and skips subdirectories', async () => {
    readdirMock.mockResolvedValue([
      { name: 'old.pdf', isFile: () => true },
      { name: 'fresh.pdf', isFile: () => true },
      { name: 'borders', isFile: () => false },
    ]);
    statMock.mockImplementation((path: string) =>
      Promise.resolve({
        mtime: String(path).includes('old')
          ? new Date('2026-01-01T00:00:00.000Z')
          : NOW,
      }),
    );

    await service.purgeExpired();

    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect(unlinkMock).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[/\\]old\.pdf$/),
    );
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
