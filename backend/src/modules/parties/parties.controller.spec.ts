import { PartiesController } from './parties.controller';
import { StorageService } from '../storage/storage.service';

describe('PartiesController uploads', () => {
  const partiesService = {
    addBinaryChatMessage: jest.fn(),
    assertMemberById: jest.fn().mockResolvedValue(undefined),
  } as any;

  const storageService = {
    put: jest.fn().mockResolvedValue(undefined),
    urlForKey: jest.fn((key: string) => `/api/v1/files/${key}`),
  } as unknown as StorageService;

  let controller: PartiesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PartiesController(partiesService, storageService);
  });

  it('delegates audio uploads to the service with duration metadata', async () => {
    partiesService.addBinaryChatMessage.mockResolvedValue({ id: 'm-audio' });

    const file = {
      buffer: Buffer.from('fake audio'),
      originalname: 'voice.webm',
      mimetype: 'audio/webm',
      size: 2048,
    } as Express.Multer.File;

    await controller.uploadChatAudio(
      'party-1',
      { user: { userId: 'u1' } },
      { durationMs: 9000 },
      file,
    );

    expect(storageService.put).toHaveBeenCalledWith(
      expect.stringMatching(/^chat\/party-1\/[0-9a-f-]{36}\.webm$/),
      file.buffer,
      'audio/webm',
    );
    expect(partiesService.addBinaryChatMessage).toHaveBeenCalledWith(
      'party-1',
      'u1',
      {
        type: 'audio',
        url: expect.stringMatching(
          /^\/api\/v1\/files\/chat\/party-1\/[0-9a-f-]{36}\.webm$/,
        ),
        name: 'voice.webm',
        mimeType: 'audio/webm',
        sizeBytes: 2048,
        durationMs: 9000,
      },
    );
  });
});
