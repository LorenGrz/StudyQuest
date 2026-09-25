import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
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
        { provide: DataSource, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    jest
      .spyOn(service, 'findById')
      .mockResolvedValue({ id: 'u1' } as User);
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
