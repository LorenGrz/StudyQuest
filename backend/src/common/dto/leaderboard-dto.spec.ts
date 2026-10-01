import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GlobalLeaderboardQueryDto, LeaderboardMeQueryDto } from './index';

describe('GlobalLeaderboardQueryDto', () => {
  it('accepts an omitted limit, university and careerId', async () => {
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

  it('rejects a careerId that is not a uuid', async () => {
    const dto = plainToInstance(GlobalLeaderboardQueryDto, {
      careerId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'careerId')).toBe(true);
  });
});

describe('LeaderboardMeQueryDto', () => {
  it('accepts an omitted university and careerId', async () => {
    const dto = plainToInstance(LeaderboardMeQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a careerId that is not a uuid', async () => {
    const dto = plainToInstance(LeaderboardMeQueryDto, {
      careerId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'careerId')).toBe(true);
  });

  it('rejects a university longer than 200 characters', async () => {
    const dto = plainToInstance(LeaderboardMeQueryDto, {
      university: 'x'.repeat(201),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'university')).toBe(true);
  });
});
