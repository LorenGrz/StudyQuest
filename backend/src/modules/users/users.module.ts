import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Subject } from '../subjects/subject.entity';
import { PartyMember } from '../parties/party-member.entity';
import { FriendRequest } from './friend-request.entity';
import { UserTitle } from '../cosmetics/user-title.entity';
import { UserInventory } from '../cosmetics/user-inventory.entity';
import { ProfileBorder } from '../cosmetics/profile-border.entity';
import { Quest } from '../quests/quest.entity';
import { PlayerResult } from '../quests/player-result.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Subject,
      PartyMember,
      FriendRequest,
      UserTitle,
      UserInventory,
      ProfileBorder,
      Quest,
      PlayerResult,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
