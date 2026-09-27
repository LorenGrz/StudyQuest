import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FxService } from './fx.service';

const makeConfig = (env: Record<string, string | undefined>) =>
  ({ get: (k: string) => env[k] }) as unknown as ConfigService;

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as Response;

describe('FxService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  it('rounds USD * venta up to the next 100 ARS', async () => {
    fetchMock.mockResolvedValue(okResponse({ venta: 1234.5 }));
    const fx = new FxService(makeConfig({ PRO_USD_PRICE: '5' }));
    // 5 * 1234.5 = 6172.5 → 6200
    await expect(fx.quoteProArs()).resolves.toEqual({
      amountArs: 6200,
      fxRate: 1234.5,
      usd: 5,
    });
  });

  it('keeps an exact multiple of 100 and defaults to USD 5', async () => {
    fetchMock.mockResolvedValue(okResponse({ venta: 1100 }));
    const fx = new FxService(makeConfig({}));
    await expect(fx.quoteProArs()).resolves.toMatchObject({
      amountArs: 5500,
      usd: 5,
    });
  });

  it('caches the rate (one fetch for several quotes)', async () => {
    fetchMock.mockResolvedValue(okResponse({ venta: 1000 }));
    const fx = new FxService(makeConfig({}));
    await fx.quoteProArs();
    await fx.quoteProArs();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches after the cache expires', async () => {
    fetchMock.mockResolvedValue(okResponse({ venta: 1000 }));
    const fx = new FxService(makeConfig({}));
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await fx.quoteProArs();
    now.mockReturnValue(1_000_000 + 61 * 60 * 1000);
    await fx.quoteProArs();
    now.mockRestore();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to PRO_PRICE_ARS_FALLBACK when fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const fx = new FxService(makeConfig({ PRO_PRICE_ARS_FALLBACK: '7000' }));
    await expect(fx.quoteProArs()).resolves.toEqual({
      amountArs: 7000,
      fxRate: 0,
      usd: 5,
    });
  });

  it.each([[{ venta: 'abc' }], [{ venta: 0 }], [{ venta: -5 }], [{}], [null]])(
    'falls back on an invalid payload %p',
    async (body) => {
      fetchMock.mockResolvedValue(okResponse(body));
      const fx = new FxService(makeConfig({ PRO_PRICE_ARS_FALLBACK: '7000' }));
      await expect(fx.quoteProArs()).resolves.toMatchObject({
        amountArs: 7000,
      });
    },
  );

  it('falls back on an HTTP error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response);
    const fx = new FxService(makeConfig({ PRO_PRICE_ARS_FALLBACK: '7000' }));
    await expect(fx.quoteProArs()).resolves.toMatchObject({ amountArs: 7000 });
  });

  it('is unavailable when the rate and the fallback are both missing', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const fx = new FxService(makeConfig({}));
    await expect(fx.quoteProArs()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
