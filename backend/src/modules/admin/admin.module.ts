import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareerRequest } from '../universities/career-request.entity';
import { Career } from '../universities/career.entity';
import { AdminController } from './admin.controller';
import { AdminCareerRequestsService } from './admin-career-requests.service';
import { AdminCommunitySubjectsService } from './admin-community-subjects.service';
import { AdminCommunitySubjectsStore } from './admin-community-subjects.store';

@Module({
  imports: [TypeOrmModule.forFeature([CareerRequest, Career])],
  controllers: [AdminController],
  providers: [
    AdminCareerRequestsService,
    AdminCommunitySubjectsService,
    AdminCommunitySubjectsStore,
  ],
})
export class AdminModule {}
