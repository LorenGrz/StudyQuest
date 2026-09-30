import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillNode } from './skill-node.entity';
import { UserSkillProgress } from './user-skill-progress.entity';
import { SkillTreeService } from './skill-tree.service';
import { SkillTreeController } from './skill-tree.controller';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SkillNode, UserSkillProgress]),
    SubjectsModule,
  ],
  providers: [SkillTreeService],
  controllers: [SkillTreeController],
  exports: [SkillTreeService],
})
export class SkillTreeModule {}
