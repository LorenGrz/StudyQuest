import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { User } from '../users/user.entity';
import { Subject } from '../subjects/subject.entity';
import { Quest } from '../quests/quest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Subject, Quest])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
