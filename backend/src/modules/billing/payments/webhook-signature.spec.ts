import { createHmac } from 'crypto';
import { verifyMercadoPagoSignature } from './webhook-signature';

const SECRET = 'test-webhook-secret';
const NOW = 1_790_000_000_000;
const TS = String(NOW / 1000);

const sign = (dataId: string, requestId: string, ts: string, secret = SECRET) =>
  createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex');

const base = () => ({
  xSignature: `ts=${TS},v1=${sign('123456', 'req-1', TS)}`,
  xRequestId: 'req-1',
  dataId: '123456',
  secret: SECRET,
  now: NOW,
});

describe('verifyMercadoPagoSignature', () => {
  it('accepts a valid signature', () => {
    expect(verifyMercadoPagoSignature(base())).toEqual({ ok: true });
  });

  it('accepts a ts in milliseconds and extra spaces', () => {
    const ts = String(NOW);
    expect(
      verifyMercadoPagoSignature({
        ...base(),
        xSignature: ` ts=${ts} , v1=${sign('123456', 'req-1', ts)} `,
      }),
    ).toEqual({ ok: true });
  });

  it('lowercases an alphanumeric data.id before signing', () => {
    expect(
      verifyMercadoPagoSignature({
        ...base(),
        dataId: 'ABC123',
        xSignature: `ts=${TS},v1=${sign('abc123', 'req-1', TS)}`,
      }),
    ).toEqual({ ok: true });
  });

  it('rejects a signature made with another secret', () => {
    expect(
      verifyMercadoPagoSignature({
        ...base(),
        xSignature: `ts=${TS},v1=${sign('123456', 'req-1', TS, 'other')}`,
      }),
    ).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rejects a tampered ts', () => {
    const tampered = String(Number(TS) + 1);
    expect(
      verifyMercadoPagoSignature({
        ...base(),
        xSignature: `ts=${tampered},v1=${sign('123456', 'req-1', TS)}`,
      }),
    ).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rejects a tampered data.id or request id', () => {
    expect(verifyMercadoPagoSignature({ ...base(), dataId: '999' })).toEqual({
      ok: false,
      reason: 'mismatch',
    });
    expect(
      verifyMercadoPagoSignature({ ...base(), xRequestId: 'req-2' }),
    ).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('accepts an MP retry signed hours ago (within 24 h)', () => {
    const ts = String(NOW / 1000 - 6 * 60 * 60);
    expect(
      verifyMercadoPagoSignature({
        ...base(),
        xSignature: `ts=${ts},v1=${sign('123456', 'req-1', ts)}`,
      }),
    ).toEqual({ ok: true });
  });

  it('rejects a correctly signed but old notification (replay > 24 h)', () => {
    const old = String(NOW / 1000 - 25 * 60 * 60);
    expect(
      verifyMercadoPagoSignature({
        ...base(),
        xSignature: `ts=${old},v1=${sign('123456', 'req-1', old)}`,
      }),
    ).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects missing headers', () => {
    expect(
      verifyMercadoPagoSignature({ ...base(), xSignature: undefined }),
    ).toEqual({ ok: false, reason: 'missing' });
    expect(
      verifyMercadoPagoSignature({ ...base(), xRequestId: undefined }),
    ).toEqual({ ok: false, reason: 'missing' });
    expect(verifyMercadoPagoSignature({ ...base(), dataId: '' })).toEqual({
      ok: false,
      reason: 'missing',
    });
  });

  it.each([
    'garbage',
    `ts=${TS}`,
    'v1=abcd',
    `ts=abc,v1=${'a'.repeat(64)}`,
    `ts=${TS},v1=nothex`,
  ])('rejects a malformed header: %s', (xSignature) => {
    expect(verifyMercadoPagoSignature({ ...base(), xSignature })).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('rejects everything when no secret is configured', () => {
    expect(verifyMercadoPagoSignature({ ...base(), secret: '' })).toEqual({
      ok: false,
      reason: 'not_configured',
    });
  });
});
