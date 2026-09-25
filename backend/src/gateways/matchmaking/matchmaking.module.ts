import { Module } from '@nestjs/common';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingService } from './matchmaking.service';
import { PartiesModule } from '../../modules/parties/parties.module';
import { UsersModule } from '../../modules/users/users.module';
import { AuthModule } from '../../modules/auth/auth.module';

@Module({
  imports: [PartiesModule, UsersModule, AuthModule],
  providers: [MatchmakingGateway, MatchmakingService],
})
export class MatchmakingModule {}
