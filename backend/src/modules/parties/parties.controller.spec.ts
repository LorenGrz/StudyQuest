import { NotFoundException } from '@nestjs/common';
import { PartiesController } from './parties.controller';
import { StorageService } from '../storage/storage.service';
import { CommunitySubjectsService } from '../subjects/community-subjects.service';

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
    controller = new PartiesController(
      partiesService,
      storageService,
      {} as CommunitySubjectsService,
    );
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

describe('PartiesController createParty', () => {
  const partiesService = {
    createForUser: jest.fn().mockResolvedValue({ id: 'p1' }),
  } as any;
  const communitySubjects = { resolveAttachable: jest.fn() };
  const controller = new PartiesController(
    partiesService,
    {} as StorageService,
    communitySubjects as unknown as CommunitySubjectsService,
  );
  const req = { user: { userId: 'u1' } };

  beforeEach(() => jest.clearAllMocks());

  it('should create the party on the resolved (e.g. merge target) subject', async () => {
    communitySubjects.resolveAttachable.mockResolvedValue('target-id');

    await controller.createParty(req, { subjectId: 'merged-id', maxMembers: 3 });

    expect(communitySubjects.resolveAttachable).toHaveBeenCalledWith(
      'u1',
      'merged-id',
      { requireEnrollment: true },
    );
    expect(partiesService.createForUser).toHaveBeenCalledWith(
      'u1',
      'target-id',
      3,
      false,
    );
  });

  it('should not create a party when the subject is not visible (404)', async () => {
    communitySubjects.resolveAttachable.mockRejectedValue(
      new NotFoundException('Materia no encontrada'),
    );

    await expect(
      controller.createParty(req, { subjectId: 'private-id' }),
    ).rejects.toThrow(NotFoundException);
    expect(partiesService.createForUser).not.toHaveBeenCalled();
  });

  it('should keep the "first enrolled subject" default when no subjectId is sent', async () => {
    await controller.createParty(req, {});

    expect(communitySubjects.resolveAttachable).not.toHaveBeenCalled();
    expect(partiesService.createForUser).toHaveBeenCalledWith(
      'u1',
      undefined,
      4,
      false,
    );
  });
});
