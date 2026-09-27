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
 * the rate can't be fetched, so checkout keeps working if dolarapi is down.
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
    const venta = await this.fetchVenta();
    if (venta !== null) {
      const quote = {
        amountArs: Math.ceil((usd * venta) / 100) * 100,
        fxRate: venta,
        usd,
      };
      this.cache = { quote, expiresAt: now + RATE_TTL_MS };
      return quote;
    }

    const fallback = Number(this.config.get<string>('PRO_PRICE_ARS_FALLBACK'));
    if (!Number.isFinite(fallback) || fallback <= 0) {
      this.logger.error(
        'Sin cotización del dólar y PRO_PRICE_ARS_FALLBACK no está configurado',
      );
      throw new ServiceUnavailableException('Pagos no disponibles');
    }
    this.logger.warn(
      `Usando PRO_PRICE_ARS_FALLBACK=${fallback} (no se pudo obtener la cotización)`,
    );
    const quote = { amountArs: Math.ceil(fallback), fxRate: 0, usd };
    this.cache = { quote, expiresAt: now + FALLBACK_TTL_MS };
    return quote;
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
