import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UniversitiesService } from './universities.service';
import { University } from './university.entity';
import { Career } from './career.entity';
import { CareerRequest } from './career-request.entity';
import { User } from '../users/user.entity';
import { DataSource } from 'typeorm';

const UBA = { id: 'uni-uba', name: 'Universidad de Buenos Aires' };
const MEDICINA = {
  id: 'car-med',
  universityId: UBA.id,
  name: 'Medicina',
  nameNormalized: 'medicina',
  faculty: null,
  level: 'grado',
  status: 'active',
};

describe('UniversitiesService', () => {
  let service: UniversitiesService;
  let universityRepo: {
    findOneBy: jest.Mock;
    find: jest.Mock;
    existsBy: jest.Mock;
  };
  let careerRepo: { findOneBy: jest.Mock; find: jest.Mock };
  let requestRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let userRepo: { update: jest.Mock };

  beforeEach(async () => {
    universityRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      existsBy: jest.fn(),
    };
    careerRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    requestRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((r: Partial<CareerRequest>) => r),
      save: jest.fn((r: Partial<CareerRequest>) =>
        Promise.resolve({ id: 'req-new', ...r }),
      ),
    };
    userRepo = { update: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UniversitiesService,
        { provide: getRepositoryToken(University), useValue: universityRepo },
        { provide: getRepositoryToken(Career), useValue: careerRepo },
        { provide: getRepositoryToken(CareerRequest), useValue: requestRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(UniversitiesService);
  });

  describe('getUniversity', () => {
    it('matches a legacy name ignoring accents and case', async () => {
      universityRepo.find.mockResolvedValue([UBA]);
      await expect(
        service.getUniversity({ name: 'universidad de BUENOS aires' }),
      ).resolves.toBe(UBA);
    });

    it('resolves the legacy UTN spelling to the FRBA catalog entry', async () => {
      const utn = {
        id: 'uni-utn',
        name: 'Universidad Tecnológica Nacional – FRBA',
      };
      universityRepo.find.mockResolvedValue([UBA, utn]);
      await expect(
        service.resolveUniversityId('Universidad Tecnológica Nacional'),
      ).resolves.toBe('uni-utn');
      await expect(
        service.resolveUniversityId('Mi Uni Inventada'),
      ).resolves.toBeNull();
    });

    it('resolves a legacy acronym through the catalog shortName', async () => {
      const unsam = {
        id: 'uni-unsam',
        name: 'Universidad Nacional de San Martín',
        shortName: 'UNSAM',
      };
      universityRepo.find.mockResolvedValue([UBA, unsam]);
      await expect(service.resolveUniversityId('unsam')).resolves.toBe(
        'uni-unsam',
      );
    });

    it('rejects an unknown university', async () => {
      await expect(
        service.getUniversity({ universityId: 'nope' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveCareer', () => {
    it('accepts an active career of that university by id', async () => {
      careerRepo.findOneBy.mockResolvedValue(MEDICINA);
      await expect(
        service.resolveCareer(UBA.id, { careerId: MEDICINA.id }),
      ).resolves.toEqual({ kind: 'career', career: MEDICINA });
      expect(careerRepo.findOneBy).toHaveBeenCalledWith({
        id: MEDICINA.id,
        universityId: UBA.id,
        status: 'active',
      });
    });

    it('rejects a career id that is retired or from another university', async () => {
      await expect(
        service.resolveCareer(UBA.id, { careerId: 'other' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects careerId and careerName together', async () => {
      await expect(
        service.resolveCareer(UBA.id, { careerId: 'a', careerName: 'b' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('resolves "Otra" to an existing career when the name matches', async () => {
      careerRepo.findOneBy.mockResolvedValue(MEDICINA);
      await expect(
        service.resolveCareer(UBA.id, { careerName: '  MEDICINA ' }),
      ).resolves.toEqual({ kind: 'career', career: MEDICINA });
      expect(careerRepo.findOneBy).toHaveBeenCalledWith({
        universityId: UBA.id,
        nameNormalized: 'medicina',
        status: 'active',
      });
    });

    it('turns an unknown "Otra" name into a request', async () => {
      await expect(
        service.resolveCareer(UBA.id, { careerName: 'Arte   Digital' }),
      ).resolves.toEqual({ kind: 'request', name: 'Arte Digital' });
    });

    it('rejects an unknown legacy career string', async () => {
      await expect(
        service.resolveCareer(UBA.id, { career: 'Inventada' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('career requests', () => {
    it('creates a pending request and points the user at it', async () => {
      const request = await service.createCareerRequest(
        'u1',
        UBA.id,
        ' Arte  Digital ',
      );
      expect(request).toMatchObject({
        id: 'req-new',
        userId: 'u1',
        universityId: UBA.id,
        name: 'Arte Digital',
        status: 'pending',
      });
      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        pendingCareerRequestId: 'req-new',
      });
    });

    it('reuses the same pending request instead of duplicating it', async () => {
      requestRepo.find.mockResolvedValue([
        {
          id: 'req-old',
          universityId: UBA.id,
          name: 'Arte Digital',
          status: 'pending',
        },
      ]);
      const request = await service.createCareerRequest(
        'u1',
        UBA.id,
        'arte digital',
      );
      expect(request.id).toBe('req-old');
      expect(requestRepo.save).not.toHaveBeenCalled();
    });

    it('caps pending requests per user at 3 (409, nothing saved)', async () => {
      requestRepo.find.mockResolvedValue([
        { id: 'r1', universityId: UBA.id, name: 'Uno', status: 'pending' },
        { id: 'r2', universityId: UBA.id, name: 'Dos', status: 'pending' },
        { id: 'r3', universityId: 'uni-x', name: 'Tres', status: 'pending' },
      ]);
      await expect(
        service.createCareerRequest('u1', UBA.id, 'Cuatro'),
      ).rejects.toThrow(ConflictException);
      expect(requestRepo.save).not.toHaveBeenCalled();
      expect(userRepo.update).not.toHaveBeenCalled();
      expect(requestRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1', status: 'pending' },
      });
    });

    it('re-submitting one of the 3 pending requests reuses it instead of 409', async () => {
      requestRepo.find.mockResolvedValue([
        { id: 'r1', universityId: UBA.id, name: 'Uno', status: 'pending' },
        { id: 'r2', universityId: UBA.id, name: 'Dos', status: 'pending' },
        { id: 'r3', universityId: UBA.id, name: 'Tres', status: 'pending' },
      ]);
      await expect(
        service.createCareerRequest('u1', UBA.id, 'dos'),
      ).resolves.toMatchObject({ id: 'r2' });
    });

    it('POST /career-requests answers 409 with the career when it exists', async () => {
      universityRepo.findOneBy.mockResolvedValue(UBA);
      careerRepo.findOneBy.mockResolvedValue(MEDICINA);
      await expect(
        service.requestCareer('u1', UBA.id, 'Medicina'),
      ).rejects.toThrow(ConflictException);
      expect(requestRepo.save).not.toHaveBeenCalled();
    });
  });

  it('listCareers 404s for an unknown university and only asks for active careers', async () => {
    universityRepo.existsBy.mockResolvedValue(false);
    await expect(service.listCareers('nope')).rejects.toThrow(
      NotFoundException,
    );

    universityRepo.existsBy.mockResolvedValue(true);
    careerRepo.find.mockResolvedValue([MEDICINA]);
    await expect(service.listCareers(UBA.id)).resolves.toEqual([
      {
        id: MEDICINA.id,
        universityId: UBA.id,
        name: 'Medicina',
        faculty: null,
        level: 'grado',
      },
    ]);
    expect(careerRepo.find).toHaveBeenCalledWith({
      where: { universityId: UBA.id, status: 'active' },
      order: { name: 'ASC' },
    });
  });
});
