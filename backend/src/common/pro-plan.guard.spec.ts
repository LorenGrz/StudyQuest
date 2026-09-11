import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ProPlanGuard } from './pro-plan.guard';
import { BillingService } from '../modules/billing/billing.service';

function contextWithUser(userId: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: userId ? { userId } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('ProPlanGuard', () => {
  let billingService: { getState: jest.Mock };
  let guard: ProPlanGuard;

  beforeEach(() => {
    billingService = { getState: jest.fn() };
    guard = new ProPlanGuard(billingService as unknown as BillingService);
  });

  it('allows a user with an active pro plan', async () => {
    billingService.getState.mockResolvedValue({ effectivePlan: 'pro' });
    await expect(guard.canActivate(contextWithUser('u1'))).resolves.toBe(true);
  });

  it('rejects a free user', async () => {
    billingService.getState.mockResolvedValue({ effectivePlan: 'free' });
    await expect(
      guard.canActivate(contextWithUser('u1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when there is no authenticated user', async () => {
    await expect(guard.canActivate(contextWithUser(undefined))).resolves.toBe(
      false,
    );
    expect(billingService.getState).not.toHaveBeenCalled();
  });
});
