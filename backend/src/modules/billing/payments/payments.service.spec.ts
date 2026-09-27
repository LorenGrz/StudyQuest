import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { Payment } from './payment.entity';
import { FxService } from './fx.service';
import { MercadoPagoClient, MpPaymentInfo } from './mercadopago.client';
import { PaymentsService } from './payments.service';

const DAY = 24 * 60 * 60 * 1000;
const PAY_ID = '11111111-2222-4333-8444-555555555555';

const fullEnv = {
  MP_WEBHOOK_SECRET: 'secret',
  PUBLIC_API_URL: 'https://api.example.com/',
  FRONTEND_URL: 'https://front.example.com/StudyQuest',
  MP_SANDBOX: 'false',
};

describe('PaymentsService', () => {
  let env: Record<string, string | undefined>;
  let paymentRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let em: { findOne: jest.Mock; save: jest.Mock };
  let fx: { quoteProArs: jest.Mock };
  let mp: {
    isConfigured: jest.Mock;
    createPreference: jest.Mock;
    getPayment: jest.Mock;
  };
  let service: PaymentsService;

  /** Rows the fake EntityManager returns, keyed by entity. */
  let rows: { payment: Payment | null; user: User | null };

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

  beforeEach(() => {
    env = { ...fullEnv };
    paymentRepo = {
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn((p) =>
        Promise.resolve(Object.assign(p, { id: p.id ?? PAY_ID })),
      ),
      findOne: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'u1', email: 'u1@mail.com' }),
    };
    rows = { payment: null, user: null };
    em = {
      findOne: jest.fn((entity) =>
        Promise.resolve(entity === Payment ? rows.payment : rows.user),
      ),
      save: jest.fn((x) => Promise.resolve(x)),
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
    };
    service = build();
  });

  // ─── createCheckout ───────────────────────────────────────────────────────

  describe('createCheckout', () => {
    it('creates a pending payment and a preference pointing back to it', async () => {
      const res = await service.createCheckout('u1');

      const created = paymentRepo.create.mock.calls[0][0];
      expect(created).toMatchObject({
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
      expect(ttl).toBe(DAY);

      expect(res).toEqual({
        paymentId: PAY_ID,
        initPoint: 'https://www.mercadopago.com.ar/checkout?pref_id=pref-1',
        amountArs: 6200,
        fxRate: 1234.5,
        usd: 5,
      });
      const lastSave = paymentRepo.save.mock.calls.at(-1)?.[0];
      expect(lastSave.mpPreferenceId).toBe('pref-1');
    });

    it('returns the sandbox init point and omits the payer in sandbox', async () => {
      env.MP_SANDBOX = 'true';
      const res = await service.createCheckout('u1');
      expect(res.initPoint).toContain('sandbox.mercadopago');
      expect(mp.createPreference.mock.calls[0][0].payer).toBeUndefined();
    });

    it.each([
      ['MP_ACCESS_TOKEN', () => mp.isConfigured.mockReturnValue(false)],
      ['MP_WEBHOOK_SECRET', () => (env.MP_WEBHOOK_SECRET = '')],
      ['PUBLIC_API_URL', () => (env.PUBLIC_API_URL = undefined)],
      ['FRONTEND_URL', () => (env.FRONTEND_URL = undefined)],
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

  describe('getForUser', () => {
    it('404s for a payment that is not the caller’s', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      await expect(service.getForUser('u2', PAY_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(paymentRepo.findOne).toHaveBeenCalledWith({
        where: { id: PAY_ID, userId: 'u2' },
      });
    });
  });

  // ─── handleNotification ───────────────────────────────────────────────────

  describe('handleNotification', () => {
    const mpPayment = (over: Partial<MpPaymentInfo> = {}): MpPaymentInfo => ({
      id: '9001',
      status: 'approved',
      statusDetail: 'accredited',
      currencyId: 'ARS',
      transactionAmount: 6200,
      externalReference: PAY_ID,
      ...over,
    });

    const pendingPayment = (): Payment =>
      ({
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
      }) as Payment;

    const freeUser = (): User =>
      ({
        id: 'u1',
        plan: 'free',
        planExpiresAt: null,
        planSource: null,
      }) as User;

    beforeEach(() => {
      rows.payment = pendingPayment();
      rows.user = freeUser();
    });

    it('grants 30 days of Pro on an approved payment, with row locks', async () => {
      mp.getPayment.mockResolvedValue(mpPayment());
      const before = Date.now();

      await expect(service.handleNotification('9001')).resolves.toBe('applied');

      const user = rows.user!;
      expect(user.plan).toBe('pro');
      expect(user.planSource).toBe('mercadopago');
      const exp = user.planExpiresAt!.getTime();
      expect(exp).toBeGreaterThanOrEqual(before + 30 * DAY);
      expect(exp).toBeLessThanOrEqual(Date.now() + 30 * DAY);

      const p = rows.payment!;
      expect(p.appliedAt).toBeInstanceOf(Date);
      expect(p.status).toBe('approved');
      expect(p.mpPaymentId).toBe('9001');

      for (const call of em.findOne.mock.calls) {
        expect(call[1].lock).toEqual({ mode: 'pessimistic_write' });
      }
    });

    it('is idempotent: a second identical notification grants nothing', async () => {
      mp.getPayment.mockResolvedValue(mpPayment());
      await service.handleNotification('9001');
      const expiryAfterFirst = rows.user!.planExpiresAt!.getTime();
      const savesAfterFirst = em.save.mock.calls.filter(
        (c) => c[0] === rows.user,
      ).length;

      await expect(service.handleNotification('9001')).resolves.toBe(
        'already_applied',
      );
      expect(rows.user!.planExpiresAt!.getTime()).toBe(expiryAfterFirst);
      expect(em.save.mock.calls.filter((c) => c[0] === rows.user).length).toBe(
        savesAfterFirst,
      );
    });

    it('extends on top of a Pro that has not expired yet', async () => {
      const future = new Date(Date.now() + 10 * DAY);
      rows.user = {
        ...freeUser(),
        plan: 'pro',
        planExpiresAt: future,
        planSource: 'promo',
      } as User;
      mp.getPayment.mockResolvedValue(mpPayment());

      await service.handleNotification('9001');

      expect(rows.user.planExpiresAt!.getTime()).toBe(
        future.getTime() + 30 * DAY,
      );
    });

    it('does not grant when the amount paid is lower', async () => {
      mp.getPayment.mockResolvedValue(mpPayment({ transactionAmount: 6199 }));
      await expect(service.handleNotification('9001')).resolves.toBe(
        'mismatch',
      );
      expect(rows.user!.plan).toBe('free');
      expect(rows.payment!.appliedAt).toBeNull();
    });

    it('does not grant when the currency is not ARS', async () => {
      mp.getPayment.mockResolvedValue(mpPayment({ currencyId: 'USD' }));
      await expect(service.handleNotification('9001')).resolves.toBe(
        'mismatch',
      );
      expect(rows.user!.plan).toBe('free');
      expect(rows.payment!.appliedAt).toBeNull();
    });

    it('records a refund without granting or revoking', async () => {
      mp.getPayment.mockResolvedValue(
        mpPayment({ status: 'refunded', statusDetail: 'refunded' }),
      );
      await expect(service.handleNotification('9001')).resolves.toBe(
        'recorded',
      );
      expect(rows.payment!.status).toBe('refunded');
      expect(rows.payment!.appliedAt).toBeNull();
      expect(rows.user!.plan).toBe('free');
    });

    it('records non-approved statuses (rejected) without granting', async () => {
      mp.getPayment.mockResolvedValue(mpPayment({ status: 'rejected' }));
      await expect(service.handleNotification('9001')).resolves.toBe(
        'recorded',
      );
      expect(rows.payment!.status).toBe('rejected');
      expect(rows.user!.plan).toBe('free');
    });

    it('ignores a different attempt on an already-applied payment', async () => {
      rows.payment = {
        ...pendingPayment(),
        status: 'approved',
        mpPaymentId: '9001',
        appliedAt: new Date(),
      } as Payment;
      mp.getPayment.mockResolvedValue(
        mpPayment({ id: '9002', status: 'rejected' }),
      );
      await expect(service.handleNotification('9002')).resolves.toBe(
        'other_attempt',
      );
      expect(rows.payment.status).toBe('approved');
      expect(rows.payment.mpPaymentId).toBe('9001');
      expect(em.save).not.toHaveBeenCalled();
    });

    it('does not throw for an unknown external_reference', async () => {
      rows.payment = null;
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
});
