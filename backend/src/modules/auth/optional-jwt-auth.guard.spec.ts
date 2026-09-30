import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

const contextWith = (headers: Record<string, string>) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as unknown as ExecutionContext;

describe('OptionalJwtAuthGuard', () => {
  const guard = new OptionalJwtAuthGuard();
  let parent: jest.SpyInstance;

  beforeEach(() => {
    parent = jest
      .spyOn(JwtAuthGuard.prototype, 'canActivate')
      .mockReturnValue(true);
  });
  afterEach(() => parent.mockRestore());

  it('should let anonymous requests through without running JWT auth', () => {
    expect(guard.canActivate(contextWith({}))).toBe(true);
    expect(parent).not.toHaveBeenCalled();
  });

  it('should run the normal JWT guard when a token is sent (invalid → 401)', () => {
    const ctx = contextWith({ authorization: 'Bearer x' });
    guard.canActivate(ctx);
    expect(parent).toHaveBeenCalledWith(ctx);
  });
});
