import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversitiesModule } from '../universities/universities.module';
import { Subject } from './subject.entity';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Subject]), UniversitiesModule],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService, TypeOrmModule],
})
export class SubjectsModule {}
