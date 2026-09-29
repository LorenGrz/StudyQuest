import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
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
import { RegisterDto } from '../../common/dto';

const UBA = { id: 'uni-uba', name: 'Universidad de Buenos Aires' };
const UTN = { id: 'uni-utn', name: 'Universidad Tecnológica Nacional – FRBA' };
const MEDICINA = { id: 'car-med', name: 'Medicina', universityId: UBA.id };

describe('UsersService (university / career)', () => {
  let service: UsersService;
  let userRepo: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    update: jest.Mock;
  };
  let txUserRepo: { create: jest.Mock; save: jest.Mock };
  let em: {
    getRepository: jest.Mock;
    createQueryBuilder: jest.Mock;
    decrement: jest.Mock;
  };
  let deleteQb: {
    delete: jest.Mock;
    from: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };
  let universities: {
    getUniversity: jest.Mock;
    resolveCareer: jest.Mock;
    createCareerRequest: jest.Mock;
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };
    txUserRepo = {
      create: jest.fn((u: Partial<User>) => u),
      save: jest.fn((u: Partial<User>) => Promise.resolve({ id: 'new', ...u })),
    };
    deleteQb = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };
    em = {
      getRepository: jest.fn().mockReturnValue(txUserRepo),
      createQueryBuilder: jest.fn().mockReturnValue(deleteQb),
      decrement: jest.fn(),
    };
    universities = {
      getUniversity: jest.fn(),
      resolveCareer: jest.fn(),
      createCareerRequest: jest.fn().mockResolvedValue({ id: 'req-1' }),
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
            transaction: (fn: (m: typeof em) => unknown) => fn(em),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: UniversitiesService, useValue: universities },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    jest.spyOn(service, 'findById').mockResolvedValue({ id: 'u1' } as User);
  });

  const registerDto = (extra: Partial<RegisterDto>): RegisterDto => ({
    email: 'ana@uba.ar',
    password: 'password123',
    username: 'ana',
    displayName: 'Ana',
    year: 1,
    ...extra,
  });

  describe('create (register)', () => {
    it('stores ids and the legacy display strings for a catalog career', async () => {
      universities.getUniversity.mockResolvedValue(UBA);
      universities.resolveCareer.mockResolvedValue({
        kind: 'career',
        career: MEDICINA,
      });

      const user = await service.create(
        registerDto({ universityId: UBA.id, careerId: MEDICINA.id }),
      );

      expect(universities.getUniversity).toHaveBeenCalledWith({
        universityId: UBA.id,
        name: undefined,
      });
      expect(universities.resolveCareer).toHaveBeenCalledWith(UBA.id, {
        careerId: MEDICINA.id,
        careerName: undefined,
        career: undefined,
      });
      expect(user).toMatchObject({
        university: UBA.name,
        universityId: UBA.id,
        career: 'Medicina',
        careerId: MEDICINA.id,
      });
      expect(universities.createCareerRequest).not.toHaveBeenCalled();
    });

    it('creates a pending career request for "Otra" inside the same transaction', async () => {
      universities.getUniversity.mockResolvedValue(UBA);
      universities.resolveCareer.mockResolvedValue({
        kind: 'request',
        name: 'Licenciatura en Arte Digital',
      });

      const user = await service.create(
        registerDto({
          universityId: UBA.id,
          careerName: 'Licenciatura en Arte Digital',
        }),
      );

      expect(user).toMatchObject({
        universityId: UBA.id,
        career: '',
        careerId: null,
        pendingCareerRequestId: 'req-1',
      });
      expect(universities.createCareerRequest).toHaveBeenCalledWith(
        'new',
        UBA.id,
        'Licenciatura en Arte Digital',
        em,
      );
    });

    it('propagates catalog validation errors and saves nothing', async () => {
      universities.getUniversity.mockResolvedValue(UBA);
      universities.resolveCareer.mockRejectedValue(
        new BadRequestException('La carrera no existe'),
      );

      await expect(
        service.create(registerDto({ university: UBA.name, career: 'X' })),
      ).rejects.toThrow(BadRequestException);
      expect(txUserRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile (academic)', () => {
    const current = {
      id: 'u1',
      university: UBA.name,
      universityId: UBA.id,
      career: 'Medicina',
      careerId: MEDICINA.id,
    };

    it('accepts the unchanged legacy strings the old frontend re-sends', async () => {
      userRepo.findOneBy.mockResolvedValue(current);

      await service.updateProfile('u1', {
        bio: 'hola',
        university: UBA.name,
        career: 'Medicina',
      });

      expect(universities.getUniversity).not.toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalledWith('u1', { bio: 'hola' });
    });

    it('rejects a university change without a career of that university', async () => {
      userRepo.findOneBy.mockResolvedValue(current);
      universities.getUniversity.mockResolvedValue(UTN);

      await expect(
        service.updateProfile('u1', { universityId: UTN.id }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('switches career and clears a pending request', async () => {
      userRepo.findOneBy.mockResolvedValue(current);
      universities.getUniversity.mockResolvedValue(UBA);
      const odonto = { id: 'car-odo', name: 'Odontología' };
      universities.resolveCareer.mockResolvedValue({
        kind: 'career',
        career: odonto,
      });

      await service.updateProfile('u1', { careerId: odonto.id });

      expect(universities.getUniversity).toHaveBeenCalledWith({
        universityId: UBA.id,
      });
      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        university: UBA.name,
        universityId: UBA.id,
        career: 'Odontología',
        careerId: odonto.id,
        pendingCareerRequestId: null,
      });
    });

    it('"Otra" in the profile clears the career and files a request', async () => {
      userRepo.findOneBy.mockResolvedValue(current);
      universities.getUniversity.mockResolvedValue(UTN);
      universities.resolveCareer.mockResolvedValue({
        kind: 'request',
        name: 'Ingeniería Naval',
      });

      await service.updateProfile('u1', {
        universityId: UTN.id,
        careerName: 'Ingeniería Naval',
      });

      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        university: UTN.name,
        universityId: UTN.id,
        career: '',
        careerId: null,
      });
      expect(universities.createCareerRequest).toHaveBeenCalledWith(
        'u1',
        UTN.id,
        'Ingeniería Naval',
      );
    });
  });

  describe('unenrollSubject', () => {
    it('decrements enrolledCount when the enrollment existed', async () => {
      deleteQb.execute.mockResolvedValue({ affected: 1 });

      await service.unenrollSubject('u1', 's1');

      expect(deleteQb.from).toHaveBeenCalledWith('user_subjects');
      expect(deleteQb.where).toHaveBeenCalledWith(
        'user_id = :userId AND subject_id = :subjectId',
        { userId: 'u1', subjectId: 's1' },
      );
      expect(em.decrement).toHaveBeenCalledWith(
        Subject,
        { id: 's1' },
        'enrolledCount',
        1,
      );
    });

    it('does not decrement when the user was not enrolled', async () => {
      deleteQb.execute.mockResolvedValue({ affected: 0 });

      await service.unenrollSubject('u1', 's1');

      expect(em.decrement).not.toHaveBeenCalled();
    });
  });
});
