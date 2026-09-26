import type { ExecutionContext } from '@nestjs/common';

// Same key @Throttle() writes (`THROTTLER:LIMIT` + throttler name); the
// package doesn't export the constant from its public entry point.
const THROTTLER_LIMIT_KEY = 'THROTTLER:LIMIT';

export const THROTTLE_ERROR_MESSAGE =
  'Demasiadas solicitudes. Esperá un momento y volvé a intentar.';

/**
 * Every named throttler in ThrottlerModule.forRoot runs on every route. Use
 * this as a throttler's `skipIf` so it only applies to handlers (or
 * controllers) that opt in with `@Throttle({ <name>: … })`.
 */
export function onlyWhereDeclared(name: string) {
  const key = THROTTLER_LIMIT_KEY + name;
  return (context: ExecutionContext): boolean =>
    Reflect.getMetadata(key, context.getHandler()) === undefined &&
    Reflect.getMetadata(key, context.getClass()) === undefined;
}
