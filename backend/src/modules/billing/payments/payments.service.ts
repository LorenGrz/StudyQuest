import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { extendExpiry, isPermanentPro } from '../../../common/plans';
import {
  Payment,
  PAYMENT_STATUSES,
  PaymentStatus,
  TERMINAL_STATUSES,
} from './payment.entity';
import { PaymentGrant } from './payment-grant.entity';
import { FxService } from './fx.service';
import {
  MercadoPagoClient,
  MpPaymentInfo,
  PreferenceInput,
} from './mercadopago.client';

export const PRO_PAYMENT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Short-lived preferences: a stale checkout link can't be paid days later. */
export const PREFERENCE_TTL_MS = 2 * 60 * 60 * 1000;
/** Reuse a pending preference only while it has at least 30 min left. */
export const PREFERENCE_REUSE_MS = 90 * 60 * 1000;
/** At most one MP lookup per payment per this window (GET polling, cron). */
export const SYNC_THROTTLE_MS = 30 * 1000;
/** Unfinished payments older than this are no longer reconciled. */
export const RECONCILE_MAX_AGE_MS = 7 * DAY_MS;
const RECONCILE_BATCH = 100;
/** Statuses of a Payment row still worth asking MP about. */
const OPEN_STATUSES: PaymentStatus[] = [
  'pending',
  'in_process',
  'authorized',
  'approved',
  'rejected',
];

const UNAVAILABLE = 'Pagos no disponibles';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MP_PAYMENT_ID_RE = /^\d{1,24}$/;

export interface CheckoutResult {
  paymentId: string;
  initPoint: string;
  amountArs: number;
  fxRate: number;
  usd: number;
}

export type QuoteResult =
  | {
      available: true;
      usd: number;
      amountArs: number;
      fxRate: number;
      days: number;
    }
  | { available: false };

export interface PaymentView {
  id: string;
  status: PaymentStatus;
  amountArs: number;
  appliedAt: Date | null;
  /** Approved but couldn't be granted automatically: the UI shows support. */
  needsSupport: boolean;
}

/** What processing one MP payment did — returned for logs and tests. */
export type NotificationOutcome =
  | 'applied'
  | 'already_applied'
  | 'revoked'
  | 'recorded'
  | 'needs_review'
  | 'stale'
  | 'other_attempt'
  | 'unknown_reference'
  | 'mp_not_found';

/** MP's `YYYY-MM-DDTHH:mm:ss.sss±hh:mm` format. */
const mpDate = (d: Date) => d.toISOString().replace('Z', '+00:00');

const trimSlash = (s: string | undefined) =>
  s?.trim().replace(/\/+$/, '') || '';

const isTerminal = (s: PaymentStatus) => TERMINAL_STATUSES.includes(s);

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private reconciling = false;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly fx: FxService,
    private readonly mp: MercadoPagoClient,
    private readonly config: ConfigService,
  ) {}

  /**
   * Checkout is only offered when everything needed to *complete* a payment
   * safely is set: without the webhook secret a user could pay and never get
   * Pro; without the ARS fallback the FX sanity band can't be enforced.
   */
  isAvailable(): boolean {
    const fallback = Number(this.config.get<string>('PRO_PRICE_ARS_FALLBACK'));
    return (
      this.mp.isConfigured() &&
      !!this.config.get<string>('MP_WEBHOOK_SECRET')?.trim() &&
      !!trimSlash(this.config.get<string>('PUBLIC_API_URL')) &&
      !!trimSlash(this.config.get<string>('FRONTEND_URL')) &&
      Number.isFinite(fallback) &&
      fallback > 0
    );
  }

  async quote(): Promise<QuoteResult> {
    if (!this.isAvailable()) return { available: false };
    const q = await this.fx.quoteProArs();
    return { available: true, ...q, days: PRO_PAYMENT_DAYS };
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────

  async createCheckout(userId: string): Promise<CheckoutResult> {
    if (!this.isAvailable()) throw new ServiceUnavailableException(UNAVAILABLE);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (isPermanentPro(user)) {
      throw new ConflictException('Ya tenés Pro sin vencimiento.');
    }

    const quote = await this.fx.quoteProArs();
    const now = new Date();

    // Repeated clicks reuse the same fresh, unpaid preference instead of
    // piling up rows and preferences. Never reused once anything was granted.
    const reusable = await this.paymentRepo.findOne({
      where: {
        userId,
        status: 'pending',
        appliedAt: IsNull(),
        needsReviewReason: IsNull(),
        mpPreferenceId: Not(IsNull()),
        initPoint: Not(IsNull()),
        amountArs: quote.amountArs,
        createdAt: MoreThan(new Date(now.getTime() - PREFERENCE_REUSE_MS)),
      },
      order: { createdAt: 'DESC' },
    });
    if (reusable?.initPoint) {
      return {
        paymentId: reusable.id,
        initPoint: reusable.initPoint,
        amountArs: reusable.amountArs,
        fxRate: reusable.fxRate,
        usd: reusable.usdAmount,
      };
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        userId,
        status: 'pending',
        amountArs: quote.amountArs,
        usdAmount: quote.usd,
        fxRate: quote.fxRate,
        days: PRO_PAYMENT_DAYS,
      }),
    );

    const apiUrl = trimSlash(this.config.get<string>('PUBLIC_API_URL'));
    const frontUrl = trimSlash(this.config.get<string>('FRONTEND_URL'));
    const sandbox = this.isSandbox();
    const body: PreferenceInput = {
      items: [
        {
          id: 'pro-30d',
          title: 'StudyQuest Pro — 30 días',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: quote.amountArs,
        },
      ],
      external_reference: payment.id,
      // source_news=webhooks: only signed Webhooks, not legacy unsigned IPN.
      notification_url: `${apiUrl}/api/v1/payments/webhook?source_news=webhooks`,
      back_urls: {
        success: `${frontUrl}/plan?pago=ok`,
        failure: `${frontUrl}/plan?pago=error`,
        pending: `${frontUrl}/plan?pago=pendiente`,
      },
      auto_return: 'approved',
      // In sandbox the payer must be an MP *test* user; prefilling the real
      // account email makes MP reject the mix of test and real parties.
      ...(sandbox ? {} : { payer: { email: user.email } }),
      statement_descriptor: 'STUDYQUEST',
      expires: true,
      expiration_date_from: mpDate(now),
      expiration_date_to: mpDate(new Date(now.getTime() + PREFERENCE_TTL_MS)),
    };

    let pref: Awaited<ReturnType<MercadoPagoClient['createPreference']>>;
    try {
      pref = await this.mp.createPreference(body, payment.id);
    } catch (err) {
      this.logger.error(
        `No se pudo crear la preferencia para el pago ${payment.id}: ${(err as Error).message}`,
      );
      payment.status = 'cancelled';
      payment.rawStatusDetail = 'preference_failed';
      await this.paymentRepo.save(payment);
      throw new ServiceUnavailableException(
        'No se pudo iniciar el pago. Probá de nuevo en unos minutos.',
      );
    }

    const initPoint = sandbox
      ? (pref.sandboxInitPoint ?? pref.initPoint)
      : pref.initPoint;
    payment.mpPreferenceId = pref.id;
    payment.initPoint = initPoint;
    await this.paymentRepo.save(payment);

    return {
      paymentId: payment.id,
      initPoint,
      amountArs: quote.amountArs,
      fxRate: quote.fxRate,
      usd: quote.usd,
    };
  }

  // ─── Reads (with reconciliation) ──────────────────────────────────────────

  /**
   * The caller's payment. While it is still open (not granted, not in review)
   * this asks MP directly — a missed webhook heals as soon as the user looks.
   * `hint` is the `payment_id` MP appends to the back URL; it is only used
   * after MP confirms it belongs to this payment.
   */
  async getForUser(
    userId: string,
    id: string,
    hint?: string,
  ): Promise<PaymentView> {
    let p = await this.paymentRepo.findOne({ where: { id, userId } });
    // Same 404 for "doesn't exist" and "not yours": no id enumeration.
    if (!p) throw new NotFoundException('Pago no encontrado');

    if (this.isOpen(p)) {
      await this.syncPayment(p, hint);
      p = (await this.paymentRepo.findOne({ where: { id, userId } })) ?? p;
    }
    return {
      id: p.id,
      status: p.status,
      amountArs: p.amountArs,
      appliedAt: p.appliedAt,
      needsSupport: p.needsReviewReason !== null && p.appliedAt === null,
    };
  }

  /** Safety net for missed webhooks: re-checks recent open payments with MP. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcileOpenPayments(): Promise<number> {
    if (this.reconciling || !this.mp.isConfigured()) return 0;
    this.reconciling = true;
    try {
      const rows = await this.paymentRepo.find({
        where: {
          appliedAt: IsNull(),
          needsReviewReason: IsNull(),
          mpPreferenceId: Not(IsNull()),
          status: In(OPEN_STATUSES),
          createdAt: MoreThan(new Date(Date.now() - RECONCILE_MAX_AGE_MS)),
        },
        order: { createdAt: 'DESC' },
        take: RECONCILE_BATCH,
      });
      for (const row of rows) await this.syncPayment(row);
      return rows.length;
    } finally {
      this.reconciling = false;
    }
  }

  private isOpen(p: Payment): boolean {
    return (
      p.appliedAt === null &&
      p.needsReviewReason === null &&
      p.mpPreferenceId !== null &&
      OPEN_STATUSES.includes(p.status) &&
      p.createdAt.getTime() > Date.now() - RECONCILE_MAX_AGE_MS
    );
  }

  /** Looks the payment up in MP (throttled) and applies whatever it finds. */
  private async syncPayment(payment: Payment, hint?: string): Promise<void> {
    if (!this.mp.isConfigured()) return;
    const now = Date.now();
    if (
      payment.lastSyncedAt &&
      now - payment.lastSyncedAt.getTime() < SYNC_THROTTLE_MS
    ) {
      return;
    }
    await this.paymentRepo.update(payment.id, { lastSyncedAt: new Date(now) });

    try {
      const found = new Map<string, MpPaymentInfo>();
      const ownedLookup = async (mpId: string | null | undefined) => {
        if (!mpId || !MP_PAYMENT_ID_RE.test(mpId) || found.has(mpId)) return;
        const mp = await this.mp.getPayment(mpId);
        if (!mp) return;
        if (mp.externalReference !== payment.id) {
          this.logger.warn(
            `Pago MP ${mpId} no pertenece al pago ${payment.id} (ref ${mp.externalReference}); se ignora`,
          );
          return;
        }
        found.set(mp.id, mp);
      };
      await ownedLookup(hint);
      await ownedLookup(payment.mpPaymentId);
      if (![...found.values()].some((m) => m.status === 'approved')) {
        for (const mp of await this.mp.searchByExternalReference(payment.id)) {
          if (mp.externalReference === payment.id) found.set(mp.id, mp);
        }
      }
      // Non-approved attempts first so the row ends on the approved one.
      const ordered = [...found.values()].sort(
        (a, b) =>
          Number(a.status === 'approved') - Number(b.status === 'approved'),
      );
      for (const mp of ordered) {
        const outcome = await this.applyMpPayment(mp);
        this.logger.log(
          `Reconciliación pago ${payment.id} / MP ${mp.id}: ${outcome}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Reconciliación del pago ${payment.id} falló: ${(err as Error).message}`,
      );
    }
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  /**
   * Reconciles one Mercado Pago payment by id. The webhook body is never
   * trusted: status, amount, currency and our reference come from the MP API.
   */
  async handleNotification(mpPaymentId: string): Promise<NotificationOutcome> {
    const mp = await this.mp.getPayment(mpPaymentId);
    if (!mp) {
      this.logger.warn(
        `Notificación de pago ${mpPaymentId} inexistente en Mercado Pago`,
      );
      return 'mp_not_found';
    }
    return this.applyMpPayment(mp);
  }

  /**
   * Applies MP's view of one payment. Idempotent per MP payment id (the
   * payment_grants UNIQUE row), under row locks on the Payment, the grant and
   * the User, so webhooks, polling and the cron can race safely.
   */
  private async applyMpPayment(
    mp: MpPaymentInfo,
  ): Promise<NotificationOutcome> {
    const ref = mp.externalReference;
    if (!ref || !UUID_RE.test(ref)) {
      this.logger.warn(
        `Pago MP ${mp.id} sin external_reference válido (${ref})`,
      );
      return 'unknown_reference';
    }

    return this.dataSource.transaction(async (em) => {
      const payment = await em.findOne(Payment, {
        where: { id: ref },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) {
        this.logger.warn(
          `Pago MP ${mp.id} con external_reference desconocido ${ref}`,
        );
        return 'unknown_reference';
      }

      const incoming = normalizeStatus(mp.status);
      const sameAttempt = payment.mpPaymentId === mp.id;
      const grant = await em.findOne(PaymentGrant, {
        where: { mpPaymentId: mp.id },
        lock: { mode: 'pessimistic_write' },
      });

      // A refunded / charged-back MP payment never goes back to approved.
      if (sameAttempt && isTerminal(payment.status) && !isTerminal(incoming)) {
        this.logger.warn(
          `Pago MP ${mp.id}: ${payment.status} → ${incoming} ignorado (estado terminal)`,
        );
        return 'stale';
      }

      const record = () => {
        payment.mpPaymentId = mp.id;
        payment.status = incoming;
        payment.rawStatusDetail = mp.statusDetail?.slice(0, 255) ?? null;
      };

      if (incoming === 'approved') {
        if (grant) {
          if (sameAttempt || !payment.appliedAt) {
            record();
            await em.save(payment);
          }
          return 'already_applied';
        }

        const problem = this.grantProblem(mp, payment);
        if (problem) {
          record();
          payment.needsReviewReason = problem;
          await em.save(payment);
          this.logger.error(
            `Pago MP ${mp.id} aprobado sin acreditar (pago ${payment.id}, usuario ${payment.userId}): ${problem}. Revisar/reembolsar a mano.`,
          );
          return 'needs_review';
        }

        const user = payment.userId
          ? await em.findOne(User, {
              where: { id: payment.userId },
              lock: { mode: 'pessimistic_write' },
            })
          : null;
        if (!user) {
          record();
          payment.needsReviewReason = 'user_missing';
          await em.save(payment);
          this.logger.error(
            `Pago MP ${mp.id} aprobado para un usuario inexistente (pago ${payment.id})`,
          );
          return 'needs_review';
        }

        if (isPermanentPro(user)) {
          this.logger.warn(
            `Pago MP ${mp.id}: el usuario ${user.id} ya tiene Pro sin vencimiento; se registra sin cambiar el vencimiento`,
          );
        } else {
          user.plan = 'pro';
          user.planExpiresAt = extendExpiry(user.planExpiresAt, payment.days);
          user.planSource = 'mercadopago';
          await em.save(user);
        }

        await em.save(
          em.create(PaymentGrant, {
            mpPaymentId: mp.id,
            paymentId: payment.id,
            userId: user.id,
            days: payment.days,
          }),
        );
        if (payment.appliedAt) {
          this.logger.warn(
            `Pago ${payment.id}: segundo pago aprobado (MP ${mp.id}); se otorgan ${payment.days} días más`,
          );
        }
        record();
        payment.appliedAt = payment.appliedAt ?? new Date();
        await em.save(payment);
        this.logger.log(
          `Pago MP ${mp.id} acreditado: usuario ${user.id} Pro hasta ${user.planExpiresAt?.toISOString() ?? 'sin vencimiento'}`,
        );
        return 'applied';
      }

      if (isTerminal(incoming)) {
        let outcome: NotificationOutcome = 'recorded';
        if (grant && !grant.revokedAt) {
          await this.revokeGrant(em, grant, mp, incoming);
          outcome = 'revoked';
        } else {
          this.logger.warn(
            `Pago MP ${mp.id} ${incoming} (pago ${payment.id}) sin días que revocar`,
          );
        }
        if (sameAttempt || !payment.appliedAt) {
          record();
          await em.save(payment);
        }
        return outcome;
      }

      // pending / in_process / rejected / …: once something was granted, other
      // attempts on the same preference don't touch the row.
      if (payment.appliedAt && !sameAttempt) {
        this.logger.warn(
          `Pago MP ${mp.id} (${mp.status}) sobre el pago ${payment.id}, ya acreditado con ${payment.mpPaymentId}`,
        );
        return 'other_attempt';
      }
      record();
      await em.save(payment);
      return 'recorded';
    });
  }

  /** Takes back the days one refunded / charged-back MP payment granted. */
  private async revokeGrant(
    em: EntityManager,
    grant: PaymentGrant,
    mp: MpPaymentInfo,
    status: PaymentStatus,
  ): Promise<void> {
    const user = grant.userId
      ? await em.findOne(User, {
          where: { id: grant.userId },
          lock: { mode: 'pessimistic_write' },
        })
      : null;
    const now = new Date();
    if (user && user.plan === 'pro' && user.planExpiresAt) {
      const next = new Date(user.planExpiresAt.getTime() - grant.days * DAY_MS);
      if (next <= now) {
        // Same end state as the lapse cron (BillingService.expireLapsedPlans).
        user.plan = 'free';
        user.planExpiresAt = null;
        user.planSource = null;
      } else {
        user.planExpiresAt = next;
      }
      await em.save(user);
    }
    grant.revokedAt = now;
    await em.save(grant);
    this.logger.warn(
      `Pago MP ${mp.id} ${status}: se revocan ${grant.days} días al usuario ${grant.userId}` +
        (user
          ? ` → ${user.plan} hasta ${user.planExpiresAt?.toISOString() ?? '—'}`
          : ''),
    );
  }

  /** Why an approved MP payment must not be granted automatically, if any. */
  private grantProblem(mp: MpPaymentInfo, payment: Payment): string | null {
    if (mp.currencyId !== 'ARS') {
      return `currency_mismatch:${mp.currencyId ?? '?'}`;
    }
    if (
      mp.transactionAmount === null ||
      mp.transactionAmount < payment.amountArs
    ) {
      return `amount_mismatch:${mp.transactionAmount ?? '?'}<${payment.amountArs}`;
    }
    if (!this.isSandbox() && mp.liveMode !== true) {
      return 'not_live_mode';
    }
    return null;
  }

  private isSandbox(): boolean {
    return (
      this.config.get<string>('MP_SANDBOX')?.trim().toLowerCase() === 'true'
    );
  }
}

function normalizeStatus(s: string): PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(s)
    ? (s as PaymentStatus)
    : 'in_process';
}
