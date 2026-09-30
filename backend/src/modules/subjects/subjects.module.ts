import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversitiesModule } from '../universities/universities.module';
import { Subject } from './subject.entity';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { SubjectReport } from './subject-report.entity';
import { AiModule } from '../ai/ai.module';
import { CommunitySubjectsService } from './community-subjects.service';
import { CommunitySubjectsStore } from './community-subjects.store';
import { SubjectNameClassifier } from './subject-name-classifier.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, SubjectReport]),
    UniversitiesModule,
    AiModule,
  ],
  controllers: [SubjectsController],
  providers: [
    SubjectsService,
    CommunitySubjectsService,
    CommunitySubjectsStore,
    SubjectNameClassifier,
  ],
  exports: [SubjectsService, CommunitySubjectsService, TypeOrmModule],
})
export class SubjectsModule {}
