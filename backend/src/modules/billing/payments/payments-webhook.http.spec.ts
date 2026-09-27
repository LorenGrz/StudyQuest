import { createHmac } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { globalValidationPipe } from '../../../common/validation';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';

const SECRET = 'http-test-secret';

function signedHeaders(dataId: string, requestId = 'req-http-1') {
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = createHmac('sha256', SECRET)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId };
}

/**
 * The webhook through real HTTP: Express query parsing of `data.id`, header
 * casing, and the app's global ValidationPipe (forbidNonWhitelisted must not
 * reject MP's arbitrary body).
 */
describe('POST /api/v1/payments/webhook (HTTP)', () => {
  let app: INestApplication<App>;
  const payments = { handleNotification: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsWebhookController],
      providers: [
        { provide: PaymentsService, useValue: payments },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              k === 'MP_WEBHOOK_SECRET' ? SECRET : undefined,
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalPipes(globalValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() =>
    payments.handleNotification.mockReset().mockResolvedValue('applied'),
  );

  // Shape of a real MP "payment" webhook: ids in the query, extra body fields.
  const mpBody = {
    action: 'payment.updated',
    api_version: 'v1',
    data: { id: '123456789' },
    date_created: '2026-09-27T12:00:00Z',
    id: 987654,
    live_mode: true,
    type: 'payment',
    user_id: '112233',
  };

  it('accepts a correctly signed notification and processes data.id from the query', async () => {
    await request(app.getHttpServer())
      .post(
        '/api/v1/payments/webhook?data.id=123456789&type=payment&source_news=webhooks',
      )
      .set(signedHeaders('123456789'))
      .send(mpBody)
      .expect(200, { received: true });
    expect(payments.handleNotification).toHaveBeenCalledWith('123456789');
  });

  it('401s when the signature is for another data.id', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook?data.id=123456789&type=payment')
      .set(signedHeaders('111'))
      .send(mpBody)
      .expect(401);
    expect(payments.handleNotification).not.toHaveBeenCalled();
  });

  it('401s without a signature', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook?data.id=123456789&type=payment')
      .send(mpBody)
      .expect(401);
  });

  it('500s on an unexpected failure so MP retries', async () => {
    payments.handleNotification.mockRejectedValue(new Error('db down'));
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook?data.id=123456789&type=payment')
      .set(signedHeaders('123456789'))
      .send(mpBody)
      .expect(500);
  });
});
