import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubjectsService } from './subjects.service';
import { Subject } from './subject.entity';
import { CAREERS } from '../../common/careers';

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

  beforeEach(async () => {
    qb = makeQb();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SubjectsService,
        {
          provide: getRepositoryToken(Subject),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
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

  it('getCareers returns the closed CAREERS list', () => {
    expect(service.getCareers()).toEqual([...CAREERS]);
    expect(service.getCareers('cualquier universidad')).toEqual([...CAREERS]);
  });
});
