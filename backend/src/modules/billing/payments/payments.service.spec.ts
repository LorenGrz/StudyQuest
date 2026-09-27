import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { Payment } from './payment.entity';
import { PaymentGrant } from './payment-grant.entity';
import { FxService } from './fx.service';
import { MercadoPagoClient, MpPaymentInfo } from './mercadopago.client';
import {
  PaymentsService,
  PREFERENCE_TTL_MS,
  SYNC_THROTTLE_MS,
} from './payments.service';

const DAY = 24 * 60 * 60 * 1000;
const PAY_ID = '11111111-2222-4333-8444-555555555555';
const OTHER_PAY_ID = '99999999-2222-4333-8444-555555555555';

const fullEnv = {
  MP_WEBHOOK_SECRET: 'secret',
  PUBLIC_API_URL: 'https://api.example.com/',
  FRONTEND_URL: 'https://front.example.com/StudyQuest',
  MP_SANDBOX: 'false',
  PRO_PRICE_ARS_FALLBACK: '7000',
};

type Mock = jest.Mock;

describe('PaymentsService', () => {
  let env: Record<string, string | undefined>;
  let paymentRepo: {
    create: Mock;
    save: Mock;
    findOne: Mock;
    find: Mock;
    update: Mock;
  };
  let userRepo: { findOne: Mock };
  let em: { findOne: Mock; save: Mock; create: Mock };
  let fx: { quoteProArs: Mock };
  let mp: {
    isConfigured: Mock;
    createPreference: Mock;
    getPayment: Mock;
    searchByExternalReference: Mock;
  };
  let service: PaymentsService;

  /** What the fake DB holds. */
  let db: {
    payment: Payment | null;
    user: User | null;
    grants: PaymentGrant[];
  };

  const build = () =>
    new PaymentsService(
      paymentRepo as unknown as Repository<Payment>,
      userRepo as unknown as Repository<User>,
      {
        transaction: jest.fn((cb: (m: typeof em) => unknown) => cb(em)),
      } as unknown as DataSource,
      fx as unknown as FxService,
      mp as unknown as MercadoPagoClient,
      { get: (k: string) => env[k] } as unknown as ConfigService,
    );

  const grantsFor = (mpId: string) =>
    db.grants.filter((g) => g.mpPaymentId === mpId);

  beforeEach(() => {
    env = { ...fullEnv };
    db = { payment: null, user: null, grants: [] };
    paymentRepo = {
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn((p) =>
        Promise.resolve(Object.assign(p, { id: p.id ?? PAY_ID })),
      ),
      findOne: jest.fn(({ where }) =>
        Promise.resolve(
          db.payment &&
            where.id === db.payment.id &&
            where.userId === db.payment.userId
            ? db.payment
            : null,
        ),
      ),
      find: jest.fn(() => Promise.resolve(db.payment ? [db.payment] : [])),
      update: jest.fn((id, patch) => {
        if (db.payment?.id === id) Object.assign(db.payment, patch);
        return Promise.resolve();
      }),
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'u1@mail.com',
        plan: 'free',
        planExpiresAt: null,
      }),
    };
    em = {
      findOne: jest.fn((entity, { where }) => {
        if (entity === Payment)
          return Promise.resolve(
            db.payment?.id === where.id ? db.payment : null,
          );
        if (entity === PaymentGrant)
          return Promise.resolve(grantsFor(where.mpPaymentId)[0] ?? null);
        return Promise.resolve(db.user?.id === where.id ? db.user : null);
      }),
      create: jest.fn((entity, v) =>
        Object.assign(new (entity as new () => object)(), v),
      ),
      save: jest.fn((x) => {
        if (x instanceof PaymentGrant && !db.grants.includes(x)) {
          x.revokedAt = x.revokedAt ?? null;
          db.grants.push(x);
        }
        return Promise.resolve(x);
      }),
    };
    fx = {
      quoteProArs: jest
        .fn()
        .mockResolvedValue({ amountArs: 6200, fxRate: 1234.5, usd: 5 }),
    };
    mp = {
      isConfigured: jest.fn().mockReturnValue(true),
      createPreference: jest.fn().mockResolvedValue({
        id: 'pref-1',
        initPoint: 'https://www.mercadopago.com.ar/checkout?pref_id=pref-1',
        sandboxInitPoint:
          'https://sandbox.mercadopago.com.ar/checkout?pref_id=pref-1',
      }),
      getPayment: jest.fn(),
      searchByExternalReference: jest.fn().mockResolvedValue([]),
    };
    service = build();
  });

  // ─── createCheckout ───────────────────────────────────────────────────────

  describe('createCheckout', () => {
    beforeEach(() => paymentRepo.findOne.mockResolvedValue(null));

    it('creates a pending payment and a preference pointing back to it', async () => {
      const res = await service.createCheckout('u1');

      expect(paymentRepo.create.mock.calls[0][0]).toMatchObject({
        userId: 'u1',
        status: 'pending',
        amountArs: 6200,
        usdAmount: 5,
        fxRate: 1234.5,
        days: 30,
      });

      const [body, idemKey] = mp.createPreference.mock.calls[0];
      expect(idemKey).toBe(PAY_ID);
      expect(body.external_reference).toBe(PAY_ID);
      expect(body.notification_url).toBe(
        'https://api.example.com/api/v1/payments/webhook?source_news=webhooks',
      );
      expect(body.back_urls).toEqual({
        success: 'https://front.example.com/StudyQuest/plan?pago=ok',
        failure: 'https://front.example.com/StudyQuest/plan?pago=error',
        pending: 'https://front.example.com/StudyQuest/plan?pago=pendiente',
      });
      expect(body.auto_return).toBe('approved');
      expect(body.items).toEqual([
        {
          id: 'pro-30d',
          title: 'StudyQuest Pro — 30 días',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: 6200,
        },
      ]);
      expect(body.payer).toEqual({ email: 'u1@mail.com' });
      expect(body.statement_descriptor).toBe('STUDYQUEST');
      expect(body.expires).toBe(true);
      const ttl =
        new Date(body.expiration_date_to).getTime() -
        new Date(body.expiration_date_from).getTime();
      expect(ttl).toBe(PREFERENCE_TTL_MS);
      expect(ttl).toBe(2 * 60 * 60 * 1000);

      expect(res).toEqual({
        paymentId: PAY_ID,
        initPoint: 'https://www.mercadopago.com.ar/checkout?pref_id=pref-1',
        amountArs: 6200,
        fxRate: 1234.5,
        usd: 5,
      });
      const lastSave = paymentRepo.save.mock.calls.at(-1)?.[0];
      expect(lastSave.mpPreferenceId).toBe('pref-1');
      expect(lastSave.initPoint).toBe(res.initPoint);
    });

    it('reuses a fresh unpaid preference instead of creating another', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: OTHER_PAY_ID,
        initPoint: 'https://www.mercadopago.com.ar/checkout?pref_id=old',
        amountArs: 6200,
        fxRate: 1234.5,
        usdAmount: 5,
      });
      const res = await service.createCheckout('u1');
      expect(res.paymentId).toBe(OTHER_PAY_ID);
      expect(res.initPoint).toContain('pref_id=old');
      expect(mp.createPreference).not.toHaveBeenCalled();
      expect(paymentRepo.save).not.toHaveBeenCalled();
      // Only unpaid, not-in-review, same-price rows qualify.
      const where = paymentRepo.findOne.mock.calls[0][0].where;
      expect(where).toMatchObject({
        userId: 'u1',
        status: 'pending',
        amountArs: 6200,
      });
      expect(where.appliedAt).toBeDefined();
      expect(where.needsReviewReason).toBeDefined();
      expect(where.createdAt).toBeDefined();
    });

    it('returns the sandbox init point and omits the payer in sandbox', async () => {
      env.MP_SANDBOX = 'true';
      const res = await service.createCheckout('u1');
      expect(res.initPoint).toContain('sandbox.mercadopago');
      expect(mp.createPreference.mock.calls[0][0].payer).toBeUndefined();
    });

    it('is 409 for a user with permanent Pro', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'u1@mail.com',
        plan: 'pro',
        planExpiresAt: null,
      });
      await expect(service.createCheckout('u1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mp.createPreference).not.toHaveBeenCalled();
    });

    it.each([
      ['MP_ACCESS_TOKEN', () => mp.isConfigured.mockReturnValue(false)],
      ['MP_WEBHOOK_SECRET', () => (env.MP_WEBHOOK_SECRET = '')],
      ['PUBLIC_API_URL', () => (env.PUBLIC_API_URL = undefined)],
      ['FRONTEND_URL', () => (env.FRONTEND_URL = undefined)],
      ['PRO_PRICE_ARS_FALLBACK', () => (env.PRO_PRICE_ARS_FALLBACK = '')],
    ])('is 503 when %s is missing', async (_name, unset) => {
      unset();
      await expect(service.createCheckout('u1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(paymentRepo.save).not.toHaveBeenCalled();
      expect(mp.createPreference).not.toHaveBeenCalled();
    });

    it('marks the payment cancelled and is 503 when MP fails', async () => {
      mp.createPreference.mockRejectedValue(new Error('mp down'));
      await expect(service.createCheckout('u1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      const lastSave = paymentRepo.save.mock.calls.at(-1)?.[0];
      expect(lastSave.status).toBe('cancelled');
    });

    it('quote reports unavailable without calling the FX API', async () => {
      mp.isConfigured.mockReturnValue(false);
      await expect(service.quote()).resolves.toEqual({ available: false });
      expect(fx.quoteProArs).not.toHaveBeenCalled();
    });

    it('quote returns the ARS price when available', async () => {
      await expect(service.quote()).resolves.toEqual({
        available: true,
        amountArs: 6200,
        fxRate: 1234.5,
        usd: 5,
        days: 30,
      });
    });
  });

  // ─── Fixtures for the MP-payment flows ────────────────────────────────────

  const mpPayment = (over: Partial<MpPaymentInfo> = {}): MpPaymentInfo => ({
    id: '9001',
    status: 'approved',
    statusDetail: 'accredited',
    currencyId: 'ARS',
    transactionAmount: 6200,
    externalReference: PAY_ID,
    liveMode: true,
    ...over,
  });

  const pendingPayment = (over: Partial<Payment> = {}): Payment =>
    Object.assign(new Payment(), {
      id: PAY_ID,
      userId: 'u1',
      status: 'pending',
      amountArs: 6200,
      usdAmount: 5,
      fxRate: 1234.5,
      days: 30,
      mpPreferenceId: 'pref-1',
      mpPaymentId: null,
      appliedAt: null,
      rawStatusDetail: null,
      initPoint: 'https://www.mercadopago.com.ar/checkout?pref_id=pref-1',
      needsReviewReason: null,
      lastSyncedAt: null,
      createdAt: new Date(),
      ...over,
    });

  const freeUser = (): User =>
    ({
      id: 'u1',
      plan: 'free',
      planExpiresAt: null,
      planSource: null,
    }) as User;

  // ─── handleNotification ───────────────────────────────────────────────────

  describe('handleNotification', () => {
    beforeEach(() => {
      db.payment = pendingPayment();
      db.user = freeUser();
    });

    it('grants 30 days of Pro on an approved payment, with row locks', async () => {
      mp.getPayment.mockResolvedValue(mpPayment());
      const before = Date.now();

      await expect(service.handleNotification('9001')).resolves.toBe('applied');

      const user = db.user!;
      expect(user.plan).toBe('pro');
      expect(user.planSource).toBe('mercadopago');
      const exp = user.planExpiresAt!.getTime();
      expect(exp).toBeGreaterThanOrEqual(before + 30 * DAY);
      expect(exp).toBeLessThanOrEqual(Date.now() + 30 * DAY);

      expect(db.payment!.appliedAt).toBeInstanceOf(Date);
      expect(db.payment!.status).toBe('approved');
      expect(db.payment!.mpPaymentId).toBe('9001');
      expect(grantsFor('9001')).toHaveLength(1);
      expect(grantsFor('9001')[0]).toMatchObject({
        paymentId: PAY_ID,
        userId: 'u1',
        days: 30,
      });

      for (const call of em.findOne.mock.calls) {
        expect(call[1].lock).toEqual({ mode: 'pessimistic_write' });
      }
    });

    it('is idempotent: a second identical notification grants nothing', async () => {
      mp.getPayment.mockResolvedValue(mpPayment());
      await service.handleNotification('9001');
      const expiryAfterFirst = db.user!.planExpiresAt!.getTime();

      await expect(service.handleNotification('9001')).resolves.toBe(
        'already_applied',
      );
      expect(db.user!.planExpiresAt!.getTime()).toBe(expiryAfterFirst);
      expect(db.grants).toHaveLength(1);
    });

    it('grants again for a second, distinct approved MP payment on the same preference', async () => {
      mp.getPayment.mockResolvedValue(mpPayment());
      await service.handleNotification('9001');
      const afterFirst = db.user!.planExpiresAt!.getTime();

      mp.getPayment.mockResolvedValue(mpPayment({ id: '9002' }));
      await expect(service.handleNotification('9002')).resolves.toBe('applied');
      expect(db.user!.planExpiresAt!.getTime()).toBe(afterFirst + 30 * DAY);
      expect(db.grants.map((g) => g.mpPaymentId)).toEqual(['9001', '9002']);
    });

    it('extends on top of a Pro that has not expired yet', async () => {
      const future = new Date(Date.now() + 10 * DAY);
      db.user = {
        ...freeUser(),
        plan: 'pro',
        planExpiresAt: future,
        planSource: 'promo',
      } as User;
      mp.getPayment.mockResolvedValue(mpPayment());

      await service.handleNotification('9001');

      expect(db.user.planExpiresAt!.getTime()).toBe(
        future.getTime() + 30 * DAY,
      );
    });

    it('keeps a permanent Pro permanent (records the grant, no expiry)', async () => {
      db.user = {
        ...freeUser(),
        plan: 'pro',
        planExpiresAt: null,
        planSource: 'admin',
      } as User;
      mp.getPayment.mockResolvedValue(mpPayment());

      await expect(service.handleNotification('9001')).resolves.toBe('applied');
      expect(db.user.planExpiresAt).toBeNull();
      expect(db.user.planSource).toBe('admin');
      expect(db.grants).toHaveLength(1);
    });

    it.each([
      ['amount lower', { transactionAmount: 6199 }, /^amount_mismatch/],
      ['currency not ARS', { currencyId: 'USD' }, /^currency_mismatch/],
      ['test payment in live mode', { liveMode: false }, /^not_live_mode$/],
    ])(
      'flags for review instead of granting when %s',
      async (_name, over, reason) => {
        mp.getPayment.mockResolvedValue(mpPayment(over));
        const errorLog = jest
          .spyOn(service['logger'], 'error')
          .mockImplementation();

        await expect(service.handleNotification('9001')).resolves.toBe(
          'needs_review',
        );
        expect(db.user!.plan).toBe('free');
        expect(db.payment!.appliedAt).toBeNull();
        expect(db.payment!.needsReviewReason).toMatch(reason);
        expect(db.grants).toHaveLength(0);
        expect(errorLog).toHaveBeenCalled();
      },
    );

    it('accepts a non-live payment in sandbox mode', async () => {
      env.MP_SANDBOX = 'true';
      mp.getPayment.mockResolvedValue(mpPayment({ liveMode: false }));
      await expect(service.handleNotification('9001')).resolves.toBe('applied');
    });

    it('revokes the granted days on a refund', async () => {
      mp.getPayment.mockResolvedValue(mpPayment());
      db.user = {
        ...freeUser(),
        plan: 'pro',
        planExpiresAt: new Date(Date.now() + 10 * DAY),
      } as User;
      await service.handleNotification('9001');
      const granted = db.user.planExpiresAt!.getTime();

      mp.getPayment.mockResolvedValue(mpPayment({ status: 'refunded' }));
      await expect(service.handleNotification('9001')).resolves.toBe('revoked');
      expect(db.user.planExpiresAt!.getTime()).toBe(granted - 30 * DAY);
      expect(db.user.plan).toBe('pro');
      expect(db.grants[0].revokedAt).toBeInstanceOf(Date);
      expect(db.payment!.status).toBe('refunded');

      // A repeated refund notification doesn't take days twice.
      await expect(service.handleNotification('9001')).resolves.toBe(
        'recorded',
      );
      expect(db.user.planExpiresAt!.getTime()).toBe(granted - 30 * DAY);
    });

    it('drops to free when a charge-back leaves no days', async () => {
      mp.getPayment.mockResolvedValue(mpPayment());
      await service.handleNotification('9001');

      mp.getPayment.mockResolvedValue(mpPayment({ status: 'charged_back' }));
      await expect(service.handleNotification('9001')).resolves.toBe('revoked');
      expect(db.user!.plan).toBe('free');
      expect(db.user!.planExpiresAt).toBeNull();
      expect(db.user!.planSource).toBeNull();
    });

    it('records a refund of a never-granted payment without touching the user', async () => {
      mp.getPayment.mockResolvedValue(mpPayment({ status: 'refunded' }));
      await expect(service.handleNotification('9001')).resolves.toBe(
        'recorded',
      );
      expect(db.payment!.status).toBe('refunded');
      expect(db.user!.plan).toBe('free');
    });

    it('never moves a refunded payment back to approved', async () => {
      db.payment = pendingPayment({ status: 'refunded', mpPaymentId: '9001' });
      mp.getPayment.mockResolvedValue(mpPayment({ status: 'approved' }));
      await expect(service.handleNotification('9001')).resolves.toBe('stale');
      expect(db.payment.status).toBe('refunded');
      expect(db.user!.plan).toBe('free');
      expect(db.grants).toHaveLength(0);
    });

    it('records non-approved statuses (rejected) without granting', async () => {
      mp.getPayment.mockResolvedValue(mpPayment({ status: 'rejected' }));
      await expect(service.handleNotification('9001')).resolves.toBe(
        'recorded',
      );
      expect(db.payment!.status).toBe('rejected');
      expect(db.user!.plan).toBe('free');
    });

    it('ignores a rejected attempt on an already-applied payment', async () => {
      db.payment = pendingPayment({
        status: 'approved',
        mpPaymentId: '9001',
        appliedAt: new Date(),
      });
      mp.getPayment.mockResolvedValue(
        mpPayment({ id: '9002', status: 'rejected' }),
      );
      await expect(service.handleNotification('9002')).resolves.toBe(
        'other_attempt',
      );
      expect(db.payment.status).toBe('approved');
      expect(db.payment.mpPaymentId).toBe('9001');
    });

    it('does not throw for an unknown external_reference', async () => {
      db.payment = null;
      mp.getPayment.mockResolvedValue(mpPayment());
      await expect(service.handleNotification('9001')).resolves.toBe(
        'unknown_reference',
      );
      expect(em.save).not.toHaveBeenCalled();
    });

    it('does not query the DB for a non-uuid external_reference', async () => {
      mp.getPayment.mockResolvedValue(
        mpPayment({ externalReference: "x' OR 1=1" }),
      );
      await expect(service.handleNotification('9001')).resolves.toBe(
        'unknown_reference',
      );
      expect(em.findOne).not.toHaveBeenCalled();
    });

    it('does not throw when MP does not know the payment', async () => {
      mp.getPayment.mockResolvedValue(null);
      await expect(service.handleNotification('9001')).resolves.toBe(
        'mp_not_found',
      );
    });

    it('lets MP API failures bubble up (so the webhook 500s and MP retries)', async () => {
      mp.getPayment.mockRejectedValue(new Error('MP 500'));
      await expect(service.handleNotification('9001')).rejects.toThrow(
        'MP 500',
      );
    });
  });

  // ─── Reconciliation (missed webhooks) ─────────────────────────────────────

  describe('getForUser / reconciliation', () => {
    beforeEach(() => {
      db.payment = pendingPayment();
      db.user = freeUser();
    });

    it('404s for a payment that is not the caller’s', async () => {
      await expect(service.getForUser('u2', PAY_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mp.searchByExternalReference).not.toHaveBeenCalled();
    });

    it('finds a missed approved payment by external_reference and grants it', async () => {
      mp.searchByExternalReference.mockResolvedValue([mpPayment()]);

      const view = await service.getForUser('u1', PAY_ID);

      expect(mp.searchByExternalReference).toHaveBeenCalledWith(PAY_ID);
      expect(view.appliedAt).toBeInstanceOf(Date);
      expect(view.needsSupport).toBe(false);
      expect(db.user!.plan).toBe('pro');
    });

    it('uses a known mpPaymentId before searching', async () => {
      db.payment = pendingPayment({ mpPaymentId: '9001' });
      mp.getPayment.mockResolvedValue(mpPayment());

      await service.getForUser('u1', PAY_ID);

      expect(mp.getPayment).toHaveBeenCalledWith('9001');
      expect(mp.searchByExternalReference).not.toHaveBeenCalled();
      expect(db.user!.plan).toBe('pro');
    });

    it('uses the back-url payment_id hint only after MP confirms it is ours', async () => {
      mp.getPayment.mockResolvedValue(mpPayment({ id: '9001' }));
      await service.getForUser('u1', PAY_ID, '9001');
      expect(mp.getPayment).toHaveBeenCalledWith('9001');
      expect(db.user!.plan).toBe('pro');
    });

    it('ignores a hint that belongs to another payment', async () => {
      mp.getPayment.mockResolvedValue(
        mpPayment({ id: '7777', externalReference: OTHER_PAY_ID }),
      );
      const view = await service.getForUser('u1', PAY_ID, '7777');
      expect(view.appliedAt).toBeNull();
      expect(db.user!.plan).toBe('free');
      // Fell back to searching by our own reference.
      expect(mp.searchByExternalReference).toHaveBeenCalledWith(PAY_ID);
    });

    it('ignores a non-numeric hint', async () => {
      await service.getForUser('u1', PAY_ID, '../../users');
      expect(mp.getPayment).not.toHaveBeenCalled();
    });

    it('asks MP at most once per 30 s per payment', async () => {
      await service.getForUser('u1', PAY_ID);
      await service.getForUser('u1', PAY_ID);
      expect(mp.searchByExternalReference).toHaveBeenCalledTimes(1);

      db.payment!.lastSyncedAt = new Date(Date.now() - SYNC_THROTTLE_MS - 1);
      await service.getForUser('u1', PAY_ID);
      expect(mp.searchByExternalReference).toHaveBeenCalledTimes(2);
    });

    it('does not ask MP about a payment that is already applied', async () => {
      db.payment = pendingPayment({
        status: 'approved',
        appliedAt: new Date(),
      });
      await service.getForUser('u1', PAY_ID);
      expect(mp.getPayment).not.toHaveBeenCalled();
      expect(mp.searchByExternalReference).not.toHaveBeenCalled();
    });

    it('reports needsSupport for an approved payment held for review', async () => {
      mp.searchByExternalReference.mockResolvedValue([
        mpPayment({ transactionAmount: 1 }),
      ]);
      jest.spyOn(service['logger'], 'error').mockImplementation();
      const view = await service.getForUser('u1', PAY_ID);
      expect(view.needsSupport).toBe(true);
      expect(view.appliedAt).toBeNull();

      // Held payments are not reconciled again.
      mp.searchByExternalReference.mockClear();
      db.payment!.lastSyncedAt = null;
      await service.getForUser('u1', PAY_ID);
      expect(mp.searchByExternalReference).not.toHaveBeenCalled();
    });

    it('survives MP being down (returns the stored state)', async () => {
      mp.searchByExternalReference.mockRejectedValue(new Error('MP down'));
      jest.spyOn(service['logger'], 'warn').mockImplementation();
      await expect(service.getForUser('u1', PAY_ID)).resolves.toMatchObject({
        status: 'pending',
        appliedAt: null,
      });
    });

    it('the cron reconciles open payments and grants missed approvals', async () => {
      mp.searchByExternalReference.mockResolvedValue([mpPayment()]);
      await expect(service.reconcileOpenPayments()).resolves.toBe(1);
      expect(db.user!.plan).toBe('pro');
      const where = paymentRepo.find.mock.calls[0][0].where;
      expect(where.appliedAt).toBeDefined();
      expect(where.needsReviewReason).toBeDefined();
      expect(where.createdAt).toBeDefined();
    });

    it('the cron does nothing when MP is not configured', async () => {
      mp.isConfigured.mockReturnValue(false);
      await expect(service.reconcileOpenPayments()).resolves.toBe(0);
      expect(paymentRepo.find).not.toHaveBeenCalled();
    });
  });
});
