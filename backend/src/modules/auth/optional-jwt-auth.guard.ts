import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * For public routes whose answer depends on who asks (e.g. GET /subjects/:id
 * shows private subjects to their owner only). No Authorization header →
 * anonymous (`req.user` undefined). A header with an invalid or expired token
 * is still a 401, so the frontend's refresh-and-retry keeps working instead
 * of the owner silently getting a 404.
 */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    if (!req.headers.authorization) return true;
    return super.canActivate(context);
  }
}
