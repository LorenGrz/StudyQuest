import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminCareerRequestsService } from './admin-career-requests.service';
import { CareerRequest } from '../universities/career-request.entity';
import { Career } from '../universities/career.entity';
import { User } from '../users/user.entity';

const UBA = 'uni-uba';

describe('AdminCareerRequestsService', () => {
  let service: AdminCareerRequestsService;
  let requestRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let careerRepo: { findOneBy: jest.Mock; save: jest.Mock; create: jest.Mock };
  let userRepo: { update: jest.Mock };
  let em: { getRepository: jest.Mock; query: jest.Mock };

  beforeEach(async () => {
    requestRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((v: unknown) => Promise.resolve(v)),
    };
    careerRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn(
        (v: Partial<Career>) =>
          Promise.resolve({ id: 'car-new', ...v }) as Promise<Career>,
      ),
      create: jest.fn((v: Partial<Career>) => v),
    };
    userRepo = { update: jest.fn() };
    em = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === CareerRequest) return requestRepo;
        if (entity === Career) return careerRepo;
        if (entity === User) return userRepo;
        throw new Error('unexpected entity');
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminCareerRequestsService,
        { provide: getRepositoryToken(CareerRequest), useValue: requestRepo },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn((cb: any) => cb(em)) },
        },
      ],
    }).compile();
    service = moduleRef.get(AdminCareerRequestsService);
  });

  describe('list', () => {
    it('defaults to pending and orders by createdAt', async () => {
      requestRepo.find.mockResolvedValue([]);
      await service.list();
      expect(requestRepo.find).toHaveBeenCalledWith({
        where: { status: 'pending' },
        relations: ['user', 'university'],
        order: { createdAt: 'ASC' },
      });
    });

    it('filters by the given status', async () => {
      await service.list('approved');
      expect(requestRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'approved' } }),
      );
    });
  });

  describe('approve', () => {
    const target = {
      id: 'req-1',
      userId: 'u1',
      universityId: UBA,
      name: 'Licenciatura en Arte Digital',
      status: 'pending',
    };

    it('creates a career and assigns every pending request with the same normalized name', async () => {
      const other = {
        id: 'req-2',
        userId: 'u2',
        universityId: UBA,
        name: 'licenciatura en arte digital', // same key, different case
        status: 'pending',
      };
      const elsewhere = {
        id: 'req-3',
        userId: 'u3',
        universityId: UBA,
        name: 'Ingeniería en Sistemas', // different key: untouched
        status: 'pending',
      };
      requestRepo.findOne.mockResolvedValue({ ...target });
      requestRepo.find.mockResolvedValue([
        { ...target },
        { ...other },
        { ...elsewhere },
      ]);

      const result = await service.approve('req-1', {});

      expect(careerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          universityId: UBA,
          name: 'Licenciatura en Arte Digital',
          status: 'active',
        }),
      );
      expect(result.approvedRequests).toBe(2);
      expect(requestRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'req-1', status: 'approved' }),
        expect.objectContaining({ id: 'req-2', status: 'approved' }),
      ]);
      expect(em.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [
          result.career.id,
          result.career.name,
          ['req-1', 'req-2'],
          ['u1', 'u2'],
        ],
      );
    });

    it('links an existing career and reactivates it if retired', async () => {
      requestRepo.findOne.mockResolvedValue({ ...target });
      requestRepo.find.mockResolvedValue([{ ...target }]);
      const retired = { id: 'car-1', universityId: UBA, status: 'retired' };
      careerRepo.findOneBy.mockResolvedValue(retired);

      const result = await service.approve('req-1', { careerId: 'car-1' });

      expect(careerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'car-1', status: 'active' }),
      );
      expect(result.career.id).toBe('car-1');
    });

    it('rejects careerId and name together', async () => {
      await expect(
        service.approve('req-1', { careerId: 'x', name: 'y' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('404s on an unknown request', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.approve('nope', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('409s on an already-resolved request', async () => {
      requestRepo.findOne.mockResolvedValue({ ...target, status: 'approved' });
      await expect(service.approve('req-1', {})).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('reject', () => {
    const target = {
      id: 'req-1',
      userId: 'u1',
      universityId: UBA,
      name: 'Licenciatura en Arte Digital',
      status: 'pending',
    };

    it('clears the pointer and leaves the career empty', async () => {
      requestRepo.findOne.mockResolvedValue({ ...target });
      const result = await service.reject('req-1', 'No es una carrera real');

      expect(result.status).toBe('rejected');
      expect(result.adminNote).toBe('No es una carrera real');
      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 'u1', pendingCareerRequestId: 'req-1' },
        { pendingCareerRequestId: null },
      );
    });

    it('404s on an unknown request', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.reject('nope')).rejects.toThrow(NotFoundException);
    });

    it('409s on an already-resolved request', async () => {
      requestRepo.findOne.mockResolvedValue({ ...target, status: 'rejected' });
      await expect(service.reject('req-1')).rejects.toThrow(ConflictException);
    });
  });
});
