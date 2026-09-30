import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingService } from './matchmaking.service';
import { PartiesService } from '../../modules/parties/parties.service';
import { UsersService } from '../../modules/users/users.service';
import { CommunitySubjectsService } from '../../modules/subjects/community-subjects.service';
import type { JoinQueueDto } from '../../common/dto';

describe('MatchmakingGateway match:join-queue', () => {
  let matchmaking: {
    isInQueue: jest.Mock;
    addToQueue: jest.Mock;
    getQueueSize: jest.Mock;
  };
  let communitySubjects: { resolveAttachable: jest.Mock };
  let socket: { id: string; emit: jest.Mock };
  let gateway: MatchmakingGateway;

  const dto = (subjectIds: string[]) =>
    ({ subjectIds, availability: [], preferredPartySize: 4 }) as JoinQueueDto;

  beforeEach(() => {
    matchmaking = {
      isInQueue: jest.fn().mockReturnValue(false),
      addToQueue: jest.fn(),
      getQueueSize: jest.fn().mockReturnValue(1),
    };
    communitySubjects = { resolveAttachable: jest.fn() };
    gateway = new MatchmakingGateway(
      matchmaking as unknown as MatchmakingService,
      {} as PartiesService,
      { getElo: jest.fn().mockResolvedValue(1000) } as unknown as UsersService,
      communitySubjects as unknown as CommunitySubjectsService,
      {} as JwtService,
    );
    socket = { id: 'sock-1', emit: jest.fn() };
    (
      gateway as unknown as { connections: Map<string, { userId: string }> }
    ).connections.set('sock-1', { userId: 'u1' });
  });

  it('should queue with resolved subject ids (merged → target, deduplicated)', async () => {
    communitySubjects.resolveAttachable.mockImplementation(
      async (_u: string, id: string) => (id === 'merged' ? 'target' : id),
    );

    await gateway.handleJoinQueue(socket as never, dto(['merged', 'target']));

    expect(communitySubjects.resolveAttachable).toHaveBeenCalledWith(
      'u1',
      'merged',
      { requireEnrollment: true },
    );
    expect(matchmaking.addToQueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', subjectIds: ['target'] }),
    );
  });

  it('should refuse to queue when any subject is not available to the user', async () => {
    communitySubjects.resolveAttachable
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new NotFoundException());

    await gateway.handleJoinQueue(socket as never, dto(['ok', 'private']));

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'SUBJECT_NOT_AVAILABLE',
    });
    expect(matchmaking.addToQueue).not.toHaveBeenCalled();
  });
});
