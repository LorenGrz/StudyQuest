import { createHmac, timingSafeEqual } from 'crypto';

/** Notifications signed longer ago than this (or this far in the future) are rejected. */
export const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000;

export type SignatureCheck =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'missing'
        | 'malformed'
        | 'expired'
        | 'mismatch'
        | 'not_configured';
    };

export interface SignatureInput {
  /** `x-signature` header: "ts=<unix>,v1=<hex hmac>". */
  xSignature: string | undefined;
  /** `x-request-id` header. */
  xRequestId: string | undefined;
  /** `data.id` from the notification query string (or body). */
  dataId: string | undefined;
  secret: string | undefined;
  now?: number;
}

/**
 * Mercado Pago webhook signature (docs: "Notificaciones > Webhooks > validar
 * origen"): HMAC-SHA256(secret, `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`)
 * in hex, sent as `v1`. data.id is lowercased (the docs require it for
 * alphanumeric ids; payment ids are numeric so it's a no-op for them).
 */
export function verifyMercadoPagoSignature(
  input: SignatureInput,
): SignatureCheck {
  const secret = input.secret?.trim();
  if (!secret) return { ok: false, reason: 'not_configured' };

  const header = input.xSignature?.trim();
  const requestId = input.xRequestId?.trim();
  const dataId = input.dataId?.trim().toLowerCase();
  if (!header || !requestId || !dataId) return { ok: false, reason: 'missing' };

  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (key === 'ts') ts = value;
    else if (key === 'v1') v1 = value;
  }
  if (!ts || !/^\d{1,16}$/.test(ts) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) {
    return { ok: false, reason: 'malformed' };
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = Buffer.from(
    createHmac('sha256', secret).update(manifest).digest('hex'),
    'utf8',
  );
  const received = Buffer.from(v1.toLowerCase(), 'utf8');
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return { ok: false, reason: 'mismatch' };
  }

  // MP documents `ts` in seconds; accept milliseconds too (13+ digits).
  const tsNum = Number(ts);
  const tsMs = ts.length >= 13 ? tsNum : tsNum * 1000;
  const now = input.now ?? Date.now();
  if (Math.abs(now - tsMs) > SIGNATURE_MAX_AGE_MS) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true };
}
