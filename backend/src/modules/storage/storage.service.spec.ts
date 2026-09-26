import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const getSignedUrlMock = getSignedUrl as jest.Mock;

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    S3_BUCKET: 'studyquest-files',
    AWS_REGION: undefined,
    S3_ENDPOINT: undefined,
    ...overrides,
  };
  return {
    getOrThrow: jest.fn((key: string) => {
      const value = values[key];
      if (value === undefined) throw new Error(`missing ${key}`);
      return value;
    }),
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws at construction when S3_BUCKET is missing', () => {
    const cfg = makeConfig({ S3_BUCKET: undefined });
    expect(() => new StorageService(cfg)).toThrow();
  });

  it('puts an object with the given key, buffer and content type', async () => {
    sendMock.mockResolvedValue({});
    const service = new StorageService(makeConfig());

    await service.put('quests/a.pdf', Buffer.from('hi'), 'application/pdf');

    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    const command = sendMock.mock.calls[0][0] as PutObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'studyquest-files',
      Key: 'quests/a.pdf',
      ContentType: 'application/pdf',
    });
  });

  it('deletes an object for a valid key and no-ops for null', async () => {
    sendMock.mockResolvedValue({});
    const service = new StorageService(makeConfig());

    await service.delete('quests/a.pdf');
    expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));

    sendMock.mockClear();
    await service.delete(null);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('swallows delete errors instead of throwing', async () => {
    sendMock.mockRejectedValue(new Error('boom'));
    const service = new StorageService(makeConfig());

    await expect(service.delete('quests/a.pdf')).resolves.toBeUndefined();
  });

  it('batch-deletes only the non-null keys and no-ops when none are valid', async () => {
    sendMock.mockResolvedValue({});
    const service = new StorageService(makeConfig());

    await service.deleteMany([
      'quests/a.pdf',
      null,
      undefined,
      'chat/p1/b.mp3',
    ]);

    expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteObjectsCommand));
    const command = sendMock.mock.calls[0][0] as DeleteObjectsCommand;
    expect(command.input.Delete?.Objects).toEqual([
      { Key: 'quests/a.pdf' },
      { Key: 'chat/p1/b.mp3' },
    ]);

    sendMock.mockClear();
    await service.deleteMany([null, undefined]);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('presigns a GET url with the given ttl', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed.example/quests/a.pdf');
    const service = new StorageService(makeConfig());

    const url = await service.presignGet('quests/a.pdf', 120);

    expect(url).toBe('https://signed.example/quests/a.pdf');
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 120 },
    );
  });

  it('exists() returns true when HeadObject succeeds', async () => {
    sendMock.mockResolvedValue({});
    const service = new StorageService(makeConfig());

    await expect(service.exists('quests/a.pdf')).resolves.toBe(true);
    expect(sendMock).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
  });

  it('exists() returns false on a 404 NotFound', async () => {
    sendMock.mockRejectedValue({ $metadata: { httpStatusCode: 404 } });
    const service = new StorageService(makeConfig());

    await expect(service.exists('quests/missing.pdf')).resolves.toBe(false);
  });

  // The app's IAM user has no s3:ListBucket, so a missing key can come back
  // as AccessDenied (403) instead of NotFound (404) — both mean "not found".
  it('exists() returns false on a 403 AccessDenied', async () => {
    sendMock.mockRejectedValue({ $metadata: { httpStatusCode: 403 } });
    const service = new StorageService(makeConfig());

    await expect(service.exists('quests/missing.pdf')).resolves.toBe(false);
  });

  it('exists() rethrows any other error', async () => {
    sendMock.mockRejectedValue({ $metadata: { httpStatusCode: 500 } });
    const service = new StorageService(makeConfig());

    await expect(service.exists('quests/a.pdf')).rejects.toBeDefined();
  });

  describe('isValidKey', () => {
    const service = new StorageService(makeConfig());

    it.each(['quests/a.pdf', 'chat/party-1/b.webm', 'avatars/user-1/c.png'])(
      'accepts %s',
      (key) => {
        expect(service.isValidKey(key)).toBe(true);
      },
    );

    it.each([
      '',
      'quests/../secrets.env',
      '../../etc/passwd',
      'borders/gold.svg',
      'quests',
    ])('rejects %s', (key) => {
      expect(service.isValidKey(key)).toBe(false);
    });
  });

  describe('keyFromUrl / urlForKey', () => {
    const service = new StorageService(makeConfig());

    it('round-trips a valid key', () => {
      const url = service.urlForKey('quests/a.pdf');
      expect(url).toBe('/api/v1/files/quests/a.pdf');
      expect(service.keyFromUrl(url)).toBe('quests/a.pdf');
    });

    it('returns null for legacy /uploads/... rows', () => {
      expect(service.keyFromUrl('/uploads/a.pdf')).toBeNull();
    });

    it('returns null for a path-traversal attempt', () => {
      expect(
        service.keyFromUrl('/api/v1/files/quests/../../secrets.env'),
      ).toBeNull();
    });

    it('returns null for null/undefined input', () => {
      expect(service.keyFromUrl(null)).toBeNull();
      expect(service.keyFromUrl(undefined)).toBeNull();
    });
  });
});
