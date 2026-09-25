import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { BillingService } from '../modules/billing/billing.service';

/**
 * Gates a route to users on an active `pro` plan (promo, admin or, later, a
 * payment processor — BillingService.getState() already collapses all of
 * that into `effectivePlan`). Requires JwtAuthGuard to have run first so
 * `req.user.userId` is set.
 */
@Injectable()
export class ProPlanGuard implements CanActivate {
  constructor(private readonly billingService: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.userId;
    if (!userId) return false;

    const state = await this.billingService.getState(userId);
    if (state.effectivePlan !== 'pro') {
      throw new ForbiddenException(
        'Esta función es exclusiva del plan Pro. Canjeá un código o pasá a Pro para usarla.',
      );
    }
    return true;
  }
}
