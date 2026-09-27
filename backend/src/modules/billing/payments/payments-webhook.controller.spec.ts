import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';

const SECRET = 'whsec';

const headersFor = (dataId: string, requestId = 'req-1', secret = SECRET) => {
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  return { sig: `ts=${ts},v1=${v1}`, requestId };
};

describe('PaymentsWebhookController', () => {
  let payments: { handleNotification: jest.Mock };
  let controller: PaymentsWebhookController;

  beforeEach(() => {
    payments = { handleNotification: jest.fn().mockResolvedValue('applied') };
    controller = new PaymentsWebhookController(
      payments as unknown as PaymentsService,
      { get: () => SECRET } as unknown as ConfigService,
    );
  });

  it('processes a signed payment notification (data.id from the query)', async () => {
    const h = headersFor('123');
    await expect(
      controller.receive(
        { 'data.id': '123', type: 'payment' },
        { action: 'payment.updated', data: { id: '123' } },
        h.sig,
        h.requestId,
      ),
    ).resolves.toEqual({ received: true });
    expect(payments.handleNotification).toHaveBeenCalledWith('123');
  });

  it('falls back to body.data.id and body.type', async () => {
    const h = headersFor('456');
    await controller.receive(
      {},
      { type: 'payment', data: { id: 456 } },
      h.sig,
      h.requestId,
    );
    expect(payments.handleNotification).toHaveBeenCalledWith('456');
  });

  it('401s on a bad signature and does not process', async () => {
    const h = headersFor('123', 'req-1', 'wrong-secret');
    await expect(
      controller.receive(
        { 'data.id': '123', type: 'payment' },
        {},
        h.sig,
        h.requestId,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.receive(
        { 'data.id': '123', type: 'payment' },
        {},
        undefined,
        'req-1',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(payments.handleNotification).not.toHaveBeenCalled();
  });

  it('acks other topics without processing', async () => {
    const h = headersFor('777');
    await expect(
      controller.receive(
        { 'data.id': '777', type: 'merchant_order' },
        {},
        h.sig,
        h.requestId,
      ),
    ).resolves.toEqual({ received: true });
    expect(payments.handleNotification).not.toHaveBeenCalled();
  });

  it('acks a non-numeric payment id without processing', async () => {
    const h = headersFor('abc');
    await controller.receive(
      { 'data.id': 'abc', type: 'payment' },
      {},
      h.sig,
      h.requestId,
    );
    expect(payments.handleNotification).not.toHaveBeenCalled();
  });

  it('propagates unexpected errors (→ 500, MP retries)', async () => {
    payments.handleNotification.mockRejectedValue(new Error('db down'));
    const h = headersFor('123');
    await expect(
      controller.receive(
        { 'data.id': '123', type: 'payment' },
        {},
        h.sig,
        h.requestId,
      ),
    ).rejects.toThrow('db down');
  });
});
