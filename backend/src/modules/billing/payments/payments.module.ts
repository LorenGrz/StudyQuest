import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/user.entity';
import { Payment } from './payment.entity';
import { FxService } from './fx.service';
import { MercadoPagoClient } from './mercadopago.client';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';

/** Mercado Pago Checkout Pro: pay ARS for 30 days of Pro. */
@Module({
  imports: [TypeOrmModule.forFeature([Payment, User])],
  providers: [FxService, MercadoPagoClient, PaymentsService],
  controllers: [PaymentsController, PaymentsWebhookController],
})
export class PaymentsModule {}
