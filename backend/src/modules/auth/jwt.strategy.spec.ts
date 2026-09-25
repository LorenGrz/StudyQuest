import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy.validate', () => {
  const strategy = new JwtStrategy({
    getOrThrow: () => 'test-secret',
  } as unknown as ConfigService);

  const base = { sub: 'u1', email: 'a@b.c', username: 'u', role: 'USER' };

  it('accepts an access token', () => {
    expect(strategy.validate({ ...base, type: 'access' })).toEqual({
      userId: 'u1',
      email: 'a@b.c',
      username: 'u',
      role: 'USER',
    });
  });

  it('accepts a legacy token with no type claim', () => {
    expect(strategy.validate(base)).toMatchObject({ userId: 'u1' });
  });

  it('rejects a refresh token used as an access token', () => {
    expect(() => strategy.validate({ ...base, type: 'refresh' })).toThrow(
      UnauthorizedException,
    );
  });
});
