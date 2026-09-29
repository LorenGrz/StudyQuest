import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubjectsService } from './subjects.service';
import { Subject } from './subject.entity';
import { UniversitiesService } from '../universities/universities.service';

type Qb = {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

const makeQb = (): Qb => {
  const qb: Partial<Qb> = {};
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.skip = jest.fn().mockReturnValue(qb);
  qb.take = jest.fn().mockReturnValue(qb);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return qb as Qb;
};

describe('SubjectsService', () => {
  let service: SubjectsService;
  let qb: Qb;
  let universities: {
    listCareerNames: jest.Mock;
    listUniversities: jest.Mock;
  };

  beforeEach(async () => {
    qb = makeQb();
    universities = {
      listCareerNames: jest.fn().mockResolvedValue(['Medicina']),
      listUniversities: jest
        .fn()
        .mockResolvedValue([{ id: 'u1', name: 'UBA' }]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SubjectsService,
        {
          provide: getRepositoryToken(Subject),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
        { provide: UniversitiesService, useValue: universities },
      ],
    }).compile();
    service = moduleRef.get(SubjectsService);
  });

  it('filters career with an exact match (closed list)', async () => {
    await service.findAll({ career: 'Medicina' } as never);

    expect(qb.andWhere).toHaveBeenCalledWith('s.career = :career', {
      career: 'Medicina',
    });
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      's.career ILIKE :career',
      expect.anything(),
    );
  });

  it('filters by year, not semester', async () => {
    await service.findAll({ year: 2 } as never);

    expect(qb.andWhere).toHaveBeenCalledWith('s.year = :year', { year: 2 });
  });

  it('only lists active, public subjects', async () => {
    await service.findAll({} as never);

    expect(qb.andWhere).toHaveBeenCalledWith(`s.status = 'active'`);
    expect(qb.andWhere).toHaveBeenCalledWith(`s.visibility = 'university'`);
  });

  it('getCareers (deprecated) returns the catalog careers from the DB', async () => {
    await expect(service.getCareers('UBA')).resolves.toEqual(['Medicina']);
    expect(universities.listCareerNames).toHaveBeenCalledWith('UBA');
  });

  it('getUniversities returns catalog university names', async () => {
    await expect(service.getUniversities('ub')).resolves.toEqual(['UBA']);
    expect(universities.listUniversities).toHaveBeenCalledWith('ub');
  });
});
