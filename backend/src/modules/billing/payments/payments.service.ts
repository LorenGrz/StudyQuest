import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { extendExpiry } from '../../../common/plans';
import { Payment, PAYMENT_STATUSES, PaymentStatus } from './payment.entity';
import { FxService } from './fx.service';
import { MercadoPagoClient, PreferenceInput } from './mercadopago.client';

export const PRO_PAYMENT_DAYS = 30;
const PREFERENCE_TTL_MS = 24 * 60 * 60 * 1000;
const UNAVAILABLE = 'Pagos no disponibles';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
}

/** What handleNotification did — returned for logs and tests. */
export type NotificationOutcome =
  | 'applied'
  | 'already_applied'
  | 'recorded'
  | 'mismatch'
  | 'no_user'
  | 'other_attempt'
  | 'unknown_reference'
  | 'mp_not_found';

/** MP's current `YYYY-MM-DDTHH:mm:ss.sss±hh:mm` format. */
const mpDate = (d: Date) => d.toISOString().replace('Z', '+00:00');

const trimSlash = (s: string | undefined) =>
  s?.trim().replace(/\/+$/, '') || '';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

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
   * Checkout is only offered when everything needed to *complete* a payment is
   * set: without the webhook secret a user could pay and never get Pro.
   */
  isAvailable(): boolean {
    return (
      this.mp.isConfigured() &&
      !!this.config.get<string>('MP_WEBHOOK_SECRET')?.trim() &&
      !!trimSlash(this.config.get<string>('PUBLIC_API_URL')) &&
      !!trimSlash(this.config.get<string>('FRONTEND_URL'))
    );
  }

  async quote(): Promise<QuoteResult> {
    if (!this.isAvailable()) return { available: false };
    const q = await this.fx.quoteProArs();
    return { available: true, ...q, days: PRO_PAYMENT_DAYS };
  }

  async createCheckout(userId: string): Promise<CheckoutResult> {
    if (!this.isAvailable()) throw new ServiceUnavailableException(UNAVAILABLE);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const quote = await this.fx.quoteProArs();
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
    const now = new Date();
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

    payment.mpPreferenceId = pref.id;
    await this.paymentRepo.save(payment);

    const initPoint = sandbox
      ? (pref.sandboxInitPoint ?? pref.initPoint)
      : pref.initPoint;
    return {
      paymentId: payment.id,
      initPoint,
      amountArs: quote.amountArs,
      fxRate: quote.fxRate,
      usd: quote.usd,
    };
  }

  async getForUser(userId: string, id: string): Promise<PaymentView> {
    const p = await this.paymentRepo.findOne({ where: { id, userId } });
    // Same 404 for "doesn't exist" and "not yours": no id enumeration.
    if (!p) throw new NotFoundException('Pago no encontrado');
    return {
      id: p.id,
      status: p.status,
      amountArs: p.amountArs,
      appliedAt: p.appliedAt,
    };
  }

  /**
   * Reconciles one Mercado Pago payment. The webhook body is never trusted:
   * status, amount, currency and our reference all come from the MP API. Safe
   * to call any number of times — Pro is granted at most once per Payment row
   * (row lock + `appliedAt`).
   */
  async handleNotification(mpPaymentId: string): Promise<NotificationOutcome> {
    const mp = await this.mp.getPayment(mpPaymentId);
    if (!mp) {
      this.logger.warn(
        `Notificación de pago ${mpPaymentId} inexistente en Mercado Pago`,
      );
      return 'mp_not_found';
    }
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

      // A preference can be paid more than once (e.g. a rejected card, then a
      // good one). Once one attempt was applied, other attempts don't touch
      // the row — but a second *approved* one means the user paid twice.
      if (
        payment.appliedAt &&
        payment.mpPaymentId &&
        payment.mpPaymentId !== mp.id
      ) {
        const msg = `Pago MP ${mp.id} (${mp.status}) sobre el pago ${payment.id}, ya acreditado con ${payment.mpPaymentId}`;
        if (mp.status === 'approved') {
          this.logger.error(`${msg}: cobro duplicado, reembolsar manualmente`);
        } else {
          this.logger.warn(msg);
        }
        return 'other_attempt';
      }

      const status = normalizeStatus(mp.status);
      payment.mpPaymentId = mp.id;
      payment.status = status;
      payment.rawStatusDetail = mp.statusDetail?.slice(0, 255) ?? null;

      if (status === 'approved') {
        if (payment.appliedAt) {
          await em.save(payment);
          return 'already_applied';
        }
        if (
          mp.currencyId !== 'ARS' ||
          mp.transactionAmount === null ||
          mp.transactionAmount < payment.amountArs
        ) {
          this.logger.warn(
            `Pago MP ${mp.id} aprobado pero no coincide: ${mp.transactionAmount} ${mp.currencyId} (esperado ${payment.amountArs} ARS). No se otorga Pro.`,
          );
          payment.rawStatusDetail = `mismatch:${mp.transactionAmount ?? '?'} ${mp.currencyId ?? '?'}`;
          await em.save(payment);
          return 'mismatch';
        }
        const user = payment.userId
          ? await em.findOne(User, {
              where: { id: payment.userId },
              lock: { mode: 'pessimistic_write' },
            })
          : null;
        if (!user) {
          this.logger.warn(
            `Pago MP ${mp.id} aprobado para un usuario inexistente (pago ${payment.id})`,
          );
          await em.save(payment);
          return 'no_user';
        }

        user.plan = 'pro';
        user.planExpiresAt = extendExpiry(user.planExpiresAt, payment.days);
        user.planSource = 'mercadopago';
        await em.save(user);

        payment.appliedAt = new Date();
        await em.save(payment);
        this.logger.log(
          `Pago MP ${mp.id} acreditado: usuario ${user.id} Pro hasta ${user.planExpiresAt.toISOString()}`,
        );
        return 'applied';
      }

      if (status === 'refunded' || status === 'charged_back') {
        this.logger.warn(
          `Pago MP ${mp.id} ${status} (pago ${payment.id}, usuario ${payment.userId})` +
            (payment.appliedAt
              ? ': el Pro otorgado NO se revoca automáticamente'
              : ''),
        );
      }
      await em.save(payment);
      return 'recorded';
    });
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
