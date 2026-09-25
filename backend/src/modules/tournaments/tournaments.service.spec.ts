import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, DataSource } from 'typeorm';
import { TournamentsService } from './tournaments.service';
import { Tournament } from './tournament.entity';
import { TournamentParticipant } from './tournament-participant.entity';
import { Party } from '../parties/party.entity';
import { UsersService } from '../users/users.service';
import { PartiesService } from '../parties/parties.service';
import { QuestsService } from '../quests/quests.service';

describe('TournamentsService', () => {
  let service: TournamentsService;
  let tournamentRepo: jest.Mocked<Repository<Tournament>>;
  let participantRepo: jest.Mocked<Repository<TournamentParticipant>>;
  let partiesService: jest.Mocked<PartiesService>;
  let questsService: jest.Mocked<QuestsService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: getRepositoryToken(Tournament),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TournamentParticipant),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: getRepositoryToken(Party), useValue: {} },
        {
          provide: UsersService,
          useValue: {
            addXp: jest.fn(),
            addCoins: jest.fn(),
          },
        },
        {
          provide: PartiesService,
          useValue: {
            findByUser: jest.fn(),
            findById: jest.fn(),
            addTextChatMessage: jest.fn(),
            logActivity: jest.fn(),
          },
        },
        {
          provide: QuestsService,
          useValue: {
            findById: jest.fn(),
          },
        },
        { provide: DataSource, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(TournamentsService);
    tournamentRepo = moduleRef.get(getRepositoryToken(Tournament));
    participantRepo = moduleRef.get(getRepositoryToken(TournamentParticipant));
    partiesService = moduleRef.get(PartiesService);
    questsService = moduleRef.get(QuestsService);
  });

  it('should create a tournament and register the host party', async () => {
    const mockParty = { id: 'party-1', status: 'active' } as any;
    const mockQuest = { id: 'quest-1', title: 'Algebra Quiz' } as any;
    const mockTournament = { id: 'tournament-1', title: 'Math Cup', questId: 'quest-1' } as any;

    partiesService.findByUser.mockResolvedValue([mockParty]);
    questsService.findById.mockResolvedValue(mockQuest);
    tournamentRepo.create.mockReturnValue(mockTournament);
    tournamentRepo.save.mockResolvedValue(mockTournament);
    
    // findById mock
    tournamentRepo.findOne.mockResolvedValue({
      ...mockTournament,
      participants: [{ partyId: 'party-1' } as any],
    });

    const result = await service.create(
      {
        title: 'Math Cup',
        questId: 'quest-1',
        startsAt: new Date(),
        endsAt: new Date(),
      },
      'user-1',
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('tournament-1');
    expect(partiesService.findByUser).toHaveBeenCalledWith('user-1');
    expect(participantRepo.create).toHaveBeenCalledWith({
      tournamentId: 'tournament-1',
      partyId: 'party-1',
    });
    expect(participantRepo.save).toHaveBeenCalled();
  });
});
