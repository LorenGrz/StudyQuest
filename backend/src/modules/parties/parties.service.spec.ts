import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, DataSource } from 'typeorm';
import { PartiesService } from './parties.service';
import { Party } from './party.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
import { PartyActivity } from './party-activity.entity';
import { PartyInvitation } from './party-invitation.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('PartiesService rich chat messages', () => {
  let service: PartiesService;
  let chatRepo: jest.Mocked<Repository<ChatMessage>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PartiesService,
        { provide: getRepositoryToken(Party), useValue: {} },
        { provide: getRepositoryToken(PartyMember), useValue: { findOne: jest.fn() } },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        { provide: getRepositoryToken(PartyActivity), useValue: {} },
        { provide: getRepositoryToken(PartyInvitation), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: UsersService, useValue: { areFriends: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(PartiesService);
    chatRepo = moduleRef.get(getRepositoryToken(ChatMessage));
  });

  it('creates a text message with null attachment metadata', async () => {
    chatRepo.create.mockReturnValue({ type: 'text', text: 'hola' } as ChatMessage);
    chatRepo.save.mockResolvedValue({ id: 'm1' } as ChatMessage);
    chatRepo.findOne.mockResolvedValue({
      id: 'm1',
      type: 'text',
      text: 'hola',
      attachmentUrl: null,
      attachmentName: null,
      attachmentMimeType: null,
      attachmentSizeBytes: null,
      attachmentDurationMs: null,
      userId: 'u1',
      createdAt: new Date('2026-05-16T12:00:00.000Z'),
      user: {
        id: 'u1',
        username: 'lgrz',
        displayName: 'Loren',
        avatarUrl: null,
      } as User,
    } as ChatMessage);

    const result = await service.addTextChatMessage('party-1', 'u1', 'hola');

    expect(result.type).toBe('text');
    expect(result.attachment).toBeNull();
    expect(result.text).toBe('hola');
  });

  it('creates an audio message with attachment metadata', async () => {
    chatRepo.create.mockReturnValue({ type: 'audio' } as ChatMessage);
    chatRepo.save.mockResolvedValue({ id: 'm2' } as ChatMessage);
    chatRepo.findOne.mockResolvedValue({
      id: 'm2',
      type: 'audio',
      text: null,
      attachmentUrl: '/uploads/audio-1.webm',
      attachmentName: 'audio-1.webm',
      attachmentMimeType: 'audio/webm',
      attachmentSizeBytes: 2048,
      attachmentDurationMs: 9000,
      userId: 'u1',
      createdAt: new Date('2026-05-16T12:01:00.000Z'),
      user: {
        id: 'u1',
        username: 'lgrz',
        displayName: 'Loren',
        avatarUrl: null,
      } as User,
    } as ChatMessage);

    const result = await service.addBinaryChatMessage('party-1', 'u1', {
      type: 'audio',
      url: '/uploads/audio-1.webm',
      name: 'audio-1.webm',
      mimeType: 'audio/webm',
      sizeBytes: 2048,
      durationMs: 9000,
    });

    expect(result.type).toBe('audio');
    expect(result.attachment?.durationMs).toBe(9000);
    expect(result.attachment?.mimeType).toBe('audio/webm');
  });
});
