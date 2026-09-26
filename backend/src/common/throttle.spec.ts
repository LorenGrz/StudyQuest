import type { ExecutionContext } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { onlyWhereDeclared } from './throttle';

class OptedIn {
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  handler() {}
}

@Throttle({ strict: { limit: 5, ttl: 60_000 } })
class OptedInClass {
  handler() {}
}

class Plain {
  handler() {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  otherThrottler() {}
}

function ctx(cls: new () => object, method: string): ExecutionContext {
  return {
    getClass: () => cls,
    getHandler: () => (cls.prototype as Record<string, unknown>)[method],
  } as unknown as ExecutionContext;
}

describe('onlyWhereDeclared', () => {
  const skipStrict = onlyWhereDeclared('strict');

  it('should skip the throttler on routes that do not declare it', () => {
    expect(skipStrict(ctx(Plain, 'handler'))).toBe(true);
  });

  it('should skip when the route only declares a different throttler', () => {
    expect(skipStrict(ctx(Plain, 'otherThrottler'))).toBe(true);
  });

  it('should apply the throttler when the handler declares it', () => {
    expect(skipStrict(ctx(OptedIn, 'handler'))).toBe(false);
  });

  it('should apply the throttler when the controller declares it', () => {
    expect(skipStrict(ctx(OptedInClass, 'handler'))).toBe(false);
  });
});
