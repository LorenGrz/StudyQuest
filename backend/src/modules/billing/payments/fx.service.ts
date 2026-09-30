import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DOLAR_OFICIAL_URL = 'https://dolarapi.com/v1/dolares/oficial';
const FETCH_TIMEOUT_MS = 5_000;
/** A good rate is reused for an hour. */
const RATE_TTL_MS = 60 * 60 * 1000;
/** After a failed fetch the fallback is reused briefly so every request doesn't wait 5 s. */
const FALLBACK_TTL_MS = 5 * 60 * 1000;
const DEFAULT_USD_PRICE = 5;
/** A fetched quote outside [0.5×, 5×] PRO_PRICE_ARS_FALLBACK is treated as bogus. */
const BAND_MIN = 0.5;
const BAND_MAX = 5;
/** Default hard floor (PRO_PRICE_ARS_FLOOR) = half the fallback price. */
const FLOOR_OF_FALLBACK = 0.5;

export interface ProQuote {
  /** Rounded up to the next 100 ARS. */
  amountArs: number;
  /** ARS per USD used for the quote (0 when priced from the ARS fallback). */
  fxRate: number;
  usd: number;
}

/**
 * Prices Pro in ARS from its USD price, using the official "venta" rate from
 * dolarapi.com. Falls back to a fixed ARS price (PRO_PRICE_ARS_FALLBACK) when
 * the rate can't be fetched or looks wrong (outside a band around the
 * fallback), and never charges less than PRO_PRICE_ARS_FLOOR.
 */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private cache: { quote: ProQuote; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  usdPrice(): number {
    const n = Number(this.config.get<string>('PRO_USD_PRICE'));
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_USD_PRICE;
  }

  async quoteProArs(): Promise<ProQuote> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.quote;

    const usd = this.usdPrice();
    const fallback = this.positiveEnv('PRO_PRICE_ARS_FALLBACK');
    const floor =
      this.positiveEnv('PRO_PRICE_ARS_FLOOR') ??
      (fallback !== null ? fallback * FLOOR_OF_FALLBACK : null);

    let quote: ProQuote | null = null;
    let ttl = RATE_TTL_MS;
    const venta = await this.fetchVenta();
    if (venta !== null) {
      const raw = usd * venta;
      // Sanity band around the configured fallback: a broken/hijacked rate
      // must not make Pro cost 1 peso (or a fortune).
      if (
        fallback !== null &&
        (raw < fallback * BAND_MIN || raw > fallback * BAND_MAX)
      ) {
        this.logger.error(
          `Cotización fuera de rango (venta=${venta}, USD ${usd} = ${raw} ARS; fallback ${fallback}). Uso el fallback.`,
        );
      } else {
        quote = { amountArs: Math.ceil(raw / 100) * 100, fxRate: venta, usd };
      }
    }

    if (!quote) {
      if (fallback === null) {
        this.logger.error(
          'Sin cotización válida y PRO_PRICE_ARS_FALLBACK no está configurado',
        );
        throw new ServiceUnavailableException('Pagos no disponibles');
      }
      this.logger.warn(`Usando PRO_PRICE_ARS_FALLBACK=${fallback}`);
      quote = { amountArs: Math.ceil(fallback), fxRate: 0, usd };
      ttl = FALLBACK_TTL_MS;
    }

    if (floor !== null && quote.amountArs < floor) {
      this.logger.warn(
        `Precio ${quote.amountArs} ARS bajo el piso ${floor}; se cobra el piso`,
      );
      quote = { ...quote, amountArs: Math.ceil(floor) };
    }

    this.cache = { quote, expiresAt: now + ttl };
    return quote;
  }

  private positiveEnv(key: string): number | null {
    const n = Number(this.config.get<string>(key));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  /** The "venta" rate, or null on any network/HTTP/payload problem. */
  private async fetchVenta(): Promise<number | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(DOLAR_OFICIAL_URL, {
        signal: ctrl.signal,
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`dolarapi respondió ${res.status}`);
        return null;
      }
      const body = (await res.json()) as { venta?: unknown } | null;
      const venta = body?.venta;
      if (typeof venta !== 'number' || !Number.isFinite(venta) || venta <= 0) {
        this.logger.warn(
          `dolarapi devolvió un "venta" inválido: ${String(venta)}`,
        );
        return null;
      }
      return venta;
    } catch (err) {
      this.logger.warn(
        `No se pudo consultar dolarapi: ${(err as Error).message}`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
