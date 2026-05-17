import { PartiesController } from './parties.controller';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('PartiesController uploads', () => {
  const partiesService = {
    addBinaryChatMessage: jest.fn(),
  } as any;

  let controller: PartiesController;

  beforeEach(() => {
    controller = new PartiesController(partiesService);
  });

  it('delegates audio uploads to the service with duration metadata', async () => {
    partiesService.addBinaryChatMessage.mockResolvedValue({ id: 'm-audio' });

    const file = {
      filename: 'voice-1.webm',
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

    expect(partiesService.addBinaryChatMessage).toHaveBeenCalledWith(
      'party-1',
      'u1',
      {
        type: 'audio',
        url: '/uploads/voice-1.webm',
        name: 'voice.webm',
        mimeType: 'audio/webm',
        sizeBytes: 2048,
        durationMs: 9000,
      },
    );
  });
});
