import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  GlobalLeaderboardQueryDto,
  SubjectLeaderboardQueryDto,
  LeaderboardMeQueryDto,
} from './index';

describe('GlobalLeaderboardQueryDto', () => {
  it('accepts an omitted limit and university', async () => {
    const dto = plainToInstance(GlobalLeaderboardQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('transforms a numeric-string limit query param into a number', async () => {
    const dto = plainToInstance(GlobalLeaderboardQueryDto, { limit: '50' });
    expect(dto.limit).toBe(50);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a limit above 100', async () => {
    const dto = plainToInstance(GlobalLeaderboardQueryDto, { limit: '150' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('rejects a limit below 1', async () => {
    const dto = plainToInstance(GlobalLeaderboardQueryDto, { limit: '0' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('rejects a university longer than 200 characters', async () => {
    const dto = plainToInstance(GlobalLeaderboardQueryDto, {
      university: 'x'.repeat(201),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'university')).toBe(true);
  });
});

describe('SubjectLeaderboardQueryDto', () => {
  it('accepts an omitted limit', async () => {
    const dto = plainToInstance(SubjectLeaderboardQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a limit above 100', async () => {
    const dto = plainToInstance(SubjectLeaderboardQueryDto, { limit: '101' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });
});

describe('LeaderboardMeQueryDto', () => {
  it('accepts an omitted university and subjectId', async () => {
    const dto = plainToInstance(LeaderboardMeQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a subjectId that is not a uuid', async () => {
    const dto = plainToInstance(LeaderboardMeQueryDto, {
      subjectId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'subjectId')).toBe(true);
  });

  it('rejects a university longer than 200 characters', async () => {
    const dto = plainToInstance(LeaderboardMeQueryDto, {
      university: 'x'.repeat(201),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'university')).toBe(true);
  });
});
