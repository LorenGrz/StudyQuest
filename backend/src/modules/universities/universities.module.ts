import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { University } from './university.entity';
import { Career } from './career.entity';
import { CareerRequest } from './career-request.entity';
import { User } from '../users/user.entity';
import { UniversitiesService } from './universities.service';
import {
  CareerRequestsController,
  UniversitiesController,
} from './universities.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([University, Career, CareerRequest, User]),
  ],
  controllers: [UniversitiesController, CareerRequestsController],
  providers: [UniversitiesService],
  exports: [UniversitiesService],
})
export class UniversitiesModule {}
