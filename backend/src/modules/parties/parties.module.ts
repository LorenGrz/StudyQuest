import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Party } from './party.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Party, PartyMember, ChatMessage])],
  controllers: [PartiesController],
  providers: [PartiesService],
  exports: [PartiesService, TypeOrmModule],
})
export class PartiesModule {}
