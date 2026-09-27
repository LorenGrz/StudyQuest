import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig, {
  MercadoPagoError,
  Payment as MpPayment,
  Preference,
} from 'mercadopago';

/** The subset of the preference body we send (see PaymentsService.createCheckout). */
export interface PreferenceInput {
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    currency_id: string;
    unit_price: number;
  }>;
  external_reference: string;
  notification_url: string;
  back_urls: { success: string; failure: string; pending: string };
  auto_return: 'approved';
  payer?: { email: string };
  statement_descriptor: string;
  expires: boolean;
  expiration_date_from: string;
  expiration_date_to: string;
}

export interface PreferenceResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string | null;
}

/** The fields of a Mercado Pago payment we act on. */
export interface MpPaymentInfo {
  id: string;
  status: string;
  statusDetail: string | null;
  currencyId: string | null;
  transactionAmount: number | null;
  externalReference: string | null;
  /** false for sandbox/test payments. */
  liveMode: boolean | null;
}

interface RawMpPayment {
  id?: string | number;
  status?: string;
  status_detail?: string;
  currency_id?: string;
  transaction_amount?: number;
  external_reference?: string;
  live_mode?: boolean;
}

function toInfo(p: RawMpPayment): MpPaymentInfo {
  return {
    id: String(p.id),
    status: p.status ?? 'unknown',
    statusDetail: p.status_detail ?? null,
    currencyId: p.currency_id ?? null,
    transactionAmount:
      typeof p.transaction_amount === 'number' ? p.transaction_amount : null,
    externalReference: p.external_reference ?? null,
    liveMode: typeof p.live_mode === 'boolean' ? p.live_mode : null,
  };
}

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Thin wrapper over the official `mercadopago` SDK so PaymentsService can be
 * unit-tested with a plain mock. Not configured (no MP_ACCESS_TOKEN) → every
 * call throws; callers check `isConfigured()` first.
 */
@Injectable()
export class MercadoPagoClient {
  private readonly logger = new Logger(MercadoPagoClient.name);
  private readonly sdk: MercadoPagoConfig | null;

  constructor(config: ConfigService) {
    const token = config.get<string>('MP_ACCESS_TOKEN')?.trim();
    const sandbox =
      config.get<string>('MP_SANDBOX')?.trim().toLowerCase() === 'true';
    if (token?.startsWith('TEST-') && !sandbox) {
      this.logger.warn(
        'MP_ACCESS_TOKEN es de prueba (TEST-) pero MP_SANDBOX no es true: los pagos no se acreditarán (live_mode=false)',
      );
    } else if (token?.startsWith('APP_USR-') && sandbox) {
      this.logger.warn(
        'MP_SANDBOX=true con un token APP_USR-: correcto solo si es el token de un usuario de prueba',
      );
    }
    this.sdk = token
      ? new MercadoPagoConfig({
          accessToken: token,
          options: { timeout: REQUEST_TIMEOUT_MS },
        })
      : null;
  }

  isConfigured(): boolean {
    return this.sdk !== null;
  }

  async createPreference(
    body: PreferenceInput,
    idempotencyKey: string,
  ): Promise<PreferenceResult> {
    const res = await new Preference(this.requireSdk()).create({
      body,
      requestOptions: { idempotencyKey },
    });
    if (!res.id || !res.init_point) {
      throw new Error('Mercado Pago no devolvió id/init_point');
    }
    return {
      id: res.id,
      initPoint: res.init_point,
      sandboxInitPoint: res.sandbox_init_point ?? null,
    };
  }

  /** The payment as Mercado Pago sees it, or null if it doesn't exist (404). */
  async getPayment(id: string): Promise<MpPaymentInfo | null> {
    try {
      const p = await new MpPayment(this.requireSdk()).get({ id });
      return toInfo(p);
    } catch (err) {
      if (err instanceof MercadoPagoError && err.status === 404) return null;
      throw err;
    }
  }

  /** Every MP payment made against one of our preferences (by external_reference). */
  async searchByExternalReference(ref: string): Promise<MpPaymentInfo[]> {
    const res = await new MpPayment(this.requireSdk()).search({
      options: {
        external_reference: ref,
        sort: 'date_created',
        criteria: 'desc',
        limit: 20,
      },
    });
    return (res.results ?? [])
      .filter((p) => p.id !== undefined && p.id !== null)
      .map((p) => toInfo(p));
  }

  private requireSdk(): MercadoPagoConfig {
    if (!this.sdk) throw new Error('MP_ACCESS_TOKEN no configurado');
    return this.sdk;
  }
}
