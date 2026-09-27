import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Quest } from '../quests/quest.entity';
import { PromoCode } from './promo-code.entity';
import { PromoRedemption } from './promo-redemption.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Quest, PromoCode, PromoRedemption]),
    PaymentsModule,
  ],
  providers: [BillingService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
