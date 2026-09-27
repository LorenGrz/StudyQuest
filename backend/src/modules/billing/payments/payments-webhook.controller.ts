import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { MP_PAYMENT_ID_RE, PaymentsService } from './payments.service';
import { verifyMercadoPagoSignature } from './webhook-signature';

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined;

/**
 * Mercado Pago webhook. Public (MP calls it), authenticated by the
 * `x-signature` HMAC instead of a JWT. Body and query are plain `unknown`
 * objects on purpose: a class DTO would be rejected by the global
 * forbidNonWhitelisted pipe, and nothing in them is trusted anyway — the
 * payment is re-read from the MP API.
 *
 * Responses: 401 bad signature; 200 for anything we processed or chose to
 * ignore; 5xx (thrown) only for unexpected failures so MP retries.
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('payments/webhook')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async receive(
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
  ): Promise<{ received: true }> {
    const b = (body && typeof body === 'object' ? body : {}) as Record<
      string,
      unknown
    >;
    const bodyData =
      b.data && typeof b.data === 'object'
        ? (b.data as Record<string, unknown>)
        : {};
    const dataId = str(query['data.id']) ?? str(bodyData.id);
    const topic = str(query.type) ?? str(query.topic) ?? str(b.type);

    const check = verifyMercadoPagoSignature({
      xSignature,
      xRequestId,
      dataId,
      secret: this.config.get<string>('MP_WEBHOOK_SECRET'),
    });
    if (!check.ok) {
      this.logger.warn(
        `Webhook MP rechazado (${check.reason}) data.id=${dataId} request-id=${xRequestId}`,
      );
      throw new UnauthorizedException();
    }

    if (topic !== 'payment') return { received: true };
    if (!dataId || !MP_PAYMENT_ID_RE.test(dataId)) {
      this.logger.warn(`Webhook MP de pago con data.id inválido: ${dataId}`);
      return { received: true };
    }

    const outcome = await this.payments.handleNotification(dataId);
    this.logger.log(`Webhook MP pago ${dataId}: ${outcome}`);
    return { received: true };
  }
}
