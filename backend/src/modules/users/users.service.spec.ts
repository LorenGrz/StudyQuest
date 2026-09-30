import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Subject } from '../subjects/subject.entity';
import { FriendRequest } from './friend-request.entity';
import { UserTitle } from '../cosmetics/user-title.entity';
import { UserInventory } from '../cosmetics/user-inventory.entity';
import { ProfileBorder } from '../cosmetics/profile-border.entity';
import { Quest } from '../quests/quest.entity';
import { PlayerResult } from '../quests/player-result.entity';
import { UniversitiesService } from '../universities/universities.service';
import { University } from '../universities/university.entity';

describe('UsersService (settings)', () => {
  let service: UsersService;
  let userRepo: {
    findOne: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qb: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(async () => {
    qb = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Subject), useValue: {} },
        { provide: getRepositoryToken(FriendRequest), useValue: {} },
        { provide: getRepositoryToken(UserTitle), useValue: {} },
        { provide: getRepositoryToken(UserInventory), useValue: {} },
        { provide: getRepositoryToken(ProfileBorder), useValue: {} },
        { provide: getRepositoryToken(Quest), useValue: {} },
        { provide: getRepositoryToken(PlayerResult), useValue: {} },
        {
          provide: DataSource,
          useValue: {
            transaction: (fn: (em: unknown) => unknown) =>
              fn({ getRepository: () => userRepo }),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: UniversitiesService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    jest.spyOn(service, 'findById').mockResolvedValue({ id: 'u1' } as User);
  });

  describe('updateProfile', () => {
    it('throws ConflictException when username belongs to another user', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'other' });
      await expect(
        service.updateProfile('u1', { username: 'taken' }),
      ).rejects.toThrow(ConflictException);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('allows keeping your own username', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1' });
      await service.updateProfile('u1', { username: 'mine', bio: 'hola' });
      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        username: 'mine',
        bio: 'hola',
      });
    });
  });

  describe('changePassword', () => {
    it('rejects when current password is wrong', async () => {
      const hash = await bcrypt.hash('correct-pass', 4);
      qb.getOne.mockResolvedValue({ id: 'u1', passwordHash: hash });
      await expect(
        service.changePassword('u1', {
          currentPassword: 'wrong-pass',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('updates hash and clears refresh tokens on success', async () => {
      const hash = await bcrypt.hash('correct-pass', 4);
      qb.getOne.mockResolvedValue({ id: 'u1', passwordHash: hash });
      const result = await service.changePassword('u1', {
        currentPassword: 'correct-pass',
        newPassword: 'new-password',
      });
      expect(result).toEqual({ ok: true });
      expect(userRepo.update).toHaveBeenCalledTimes(1);
      const [id, patch] = userRepo.update.mock.calls[0];
      expect(id).toBe('u1');
      expect(patch.refreshTokens).toEqual([]);
      expect(await bcrypt.compare('new-password', patch.passwordHash)).toBe(
        true,
      );
    });
  });

  describe('setAvatar', () => {
    it('stores the avatar url', async () => {
      await service.setAvatar('u1', '/uploads/avatars/x.png');
      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        avatarUrl: '/uploads/avatars/x.png',
      });
    });
  });
});

describe('UsersService (dashboard stats)', () => {
  let service: UsersService;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Subject), useValue: {} },
        { provide: getRepositoryToken(FriendRequest), useValue: {} },
        { provide: getRepositoryToken(UserTitle), useValue: {} },
        { provide: getRepositoryToken(UserInventory), useValue: {} },
        { provide: getRepositoryToken(ProfileBorder), useValue: {} },
        { provide: getRepositoryToken(Quest), useValue: {} },
        { provide: getRepositoryToken(PlayerResult), useValue: {} },
        { provide: DataSource, useValue: { query } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: UniversitiesService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('should compute subject accuracy from player_results.total_questions without the quiz_questions table', async () => {
    query
      .mockResolvedValueOnce([{ total_time_ms: 600000 }])
      .mockResolvedValueOnce([
        {
          subject_id: 's1',
          subject_name: 'Física',
          correct_answers: 6,
          total_questions: 8,
          total_time_ms: 120000,
          quizzes_played: 2,
        },
      ])
      .mockResolvedValueOnce([]);

    const stats = await service.getDashboardStats('u1');

    const subjectSql = query.mock.calls[1][0] as string;
    expect(subjectSql).not.toMatch(/quiz_questions/);
    expect(subjectSql).toMatch(/SUM\(pr\.total_questions\)/);
    expect(query.mock.calls[1][1]).toEqual(['u1']);
    expect(stats.totalStudyMinutes).toBe(10);
    expect(stats.subjectPerformance).toEqual([
      {
        subjectId: 's1',
        subjectName: 'Física',
        accuracy: 0.75,
        totalQuestions: 8,
        correctAnswers: 6,
        totalStudyMinutes: 2,
        quizzesPlayed: 2,
      },
    ]);
    expect(stats.weeklyStudy).toHaveLength(7);
  });
});

function createLeaderboardQbMock() {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };
}

describe('UsersService (leaderboard)', () => {
  let service: UsersService;
  let userRepo: { createQueryBuilder: jest.Mock };
  let qb: ReturnType<typeof createLeaderboardQbMock>;
  let resolveUniversityId: jest.Mock;

  beforeEach(async () => {
    qb = createLeaderboardQbMock();
    userRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    resolveUniversityId = jest.fn(async (name: string) =>
      /tecnol[oó]gica nacional/i.test(name) ? 'uni-utn' : name === 'UBA' ? 'uni-uba' : null,
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Subject), useValue: {} },
        { provide: getRepositoryToken(FriendRequest), useValue: {} },
        { provide: getRepositoryToken(UserTitle), useValue: {} },
        { provide: getRepositoryToken(UserInventory), useValue: {} },
        { provide: getRepositoryToken(ProfileBorder), useValue: {} },
        { provide: getRepositoryToken(Quest), useValue: {} },
        { provide: getRepositoryToken(PlayerResult), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: UniversitiesService, useValue: { resolveUniversityId } },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('getGlobalLeaderboard', () => {
    it('assigns rank by array position and orders by elo desc with a username tie-breaker', async () => {
      qb.getRawMany.mockResolvedValue([
        {
          userId: 'u1',
          username: 'ana',
          displayName: 'Ana',
          avatarUrl: null,
          activeCosmetics: null,
          elo: 1200,
        },
        {
          userId: 'u2',
          username: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
          activeCosmetics: null,
          elo: 1000,
        },
      ]);

      const result = await service.getGlobalLeaderboard(20);

      expect(qb.where).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('elo', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('u.username', 'ASC');
      expect(qb.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual([
        {
          rank: 1,
          userId: 'u1',
          username: 'ana',
          displayName: 'Ana',
          avatarUrl: null,
          activeCosmetics: null,
          elo: 1200,
        },
        {
          rank: 2,
          userId: 'u2',
          username: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
          activeCosmetics: null,
          elo: 1000,
        },
      ]);
    });

    it('filters by university_id when one is provided', async () => {
      qb.getRawMany.mockResolvedValue([]);
      await service.getGlobalLeaderboard(20, { universityId: 'uni-uba' });
      expect(qb.where).toHaveBeenCalledWith('u.university_id = :universityId', {
        universityId: 'uni-uba',
      });
      expect(resolveUniversityId).not.toHaveBeenCalled();
    });

    it('resolves a legacy name, so both UTN spellings share one ranking', async () => {
      qb.getRawMany.mockResolvedValue([]);
      await service.getGlobalLeaderboard(20, {
        university: 'Universidad Tecnológica Nacional',
      });
      await service.getGlobalLeaderboard(20, {
        university: 'Universidad Tecnológica Nacional – FRBA',
      });
      expect(qb.where).toHaveBeenNthCalledWith(
        1,
        'u.university_id = :universityId',
        { universityId: 'uni-utn' },
      );
      expect(qb.where).toHaveBeenNthCalledWith(
        2,
        'u.university_id = :universityId',
        { universityId: 'uni-utn' },
      );
    });

    it('returns an empty ranking for an unknown university name', async () => {
      await expect(
        service.getGlobalLeaderboard(20, { university: 'Mi Uni Inventada' }),
      ).resolves.toEqual([]);
      expect(qb.getRawMany).not.toHaveBeenCalled();
    });

    it('defaults the limit to 20 when omitted', async () => {
      qb.getRawMany.mockResolvedValue([]);
      await service.getGlobalLeaderboard();
      expect(qb.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('getLeaderboardUniversities', () => {
    it('returns the catalog names of universities with users, ordered ascending', async () => {
      qb.getRawMany.mockResolvedValue([
        { university: 'UBA' },
        { university: 'UTN' },
      ]);

      const result = await service.getLeaderboardUniversities();

      expect(qb.distinct).toHaveBeenCalledWith(true);
      expect(qb.innerJoin).toHaveBeenCalledWith(
        University,
        'un',
        'un.id = u.university_id',
      );
      expect(qb.orderBy).toHaveBeenCalledWith('un.name', 'ASC');
      expect(result).toEqual(['UBA', 'UTN']);
    });
  });

  describe('getMyLeaderboardPosition', () => {
    beforeEach(() => {
      jest.spyOn(service, 'getElo').mockResolvedValue(1200);
    });

    it('computes rank from the count of users with a strictly higher elo (global scope)', async () => {
      qb.getRawOne
        .mockResolvedValueOnce({ count: '10' })
        .mockResolvedValueOnce({ count: '3' });

      const result = await service.getMyLeaderboardPosition('u1');

      expect(result).toEqual({ rank: 4, elo: 1200, total: 10 });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("COALESCE((u.stats->>'elo')::int"),
        { elo: 1200 },
      );
      expect(qb.where).not.toHaveBeenCalled();
      expect(qb.innerJoin).not.toHaveBeenCalled();
    });

    it('scopes the count by university when no subject is given', async () => {
      qb.getRawOne
        .mockResolvedValueOnce({ count: '5' })
        .mockResolvedValueOnce({ count: '1' });

      const result = await service.getMyLeaderboardPosition('u1', {
        university: 'UBA',
      });

      expect(result).toEqual({ rank: 2, elo: 1200, total: 5 });
      expect(qb.where).toHaveBeenCalledWith('u.university_id = :universityId', {
        universityId: 'uni-uba',
      });
      expect(qb.innerJoin).not.toHaveBeenCalled();
    });

    it('scopes the count by subject enrollment when subjectId is given, ignoring university', async () => {
      qb.getRawOne
        .mockResolvedValueOnce({ count: '8' })
        .mockResolvedValueOnce({ count: '0' });

      const result = await service.getMyLeaderboardPosition('u1', {
        university: 'UBA',
        subjectId: 'subj-1',
      });

      expect(result).toEqual({ rank: 1, elo: 1200, total: 8 });
      expect(qb.innerJoin).toHaveBeenCalledWith(
        'u.enrolledSubjects',
        's',
        's.id = :subjectId',
        { subjectId: 'subj-1' },
      );
      expect(qb.where).not.toHaveBeenCalled();
    });

    it('returns rank 1 and total 0 when the scope has no users', async () => {
      qb.getRawOne.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

      const result = await service.getMyLeaderboardPosition('u1');

      expect(result).toEqual({ rank: 1, elo: 1200, total: 0 });
    });
  });
});
