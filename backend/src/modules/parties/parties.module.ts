import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Party } from './party.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
import { PartyActivity } from './party-activity.entity';
import { PartyInvitation } from './party-invitation.entity';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Party,
      PartyMember,
      ChatMessage,
      PartyActivity,
      PartyInvitation,
      User,
    ]),
    UsersModule,
    BillingModule,
  ],
  controllers: [PartiesController],
  providers: [PartiesService],
  exports: [PartiesService, TypeOrmModule],
})
export class PartiesModule {}
