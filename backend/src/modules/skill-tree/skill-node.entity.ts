import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Subject } from '../subjects/subject.entity';

@Entity('skill_nodes')
@Index(['subjectId', 'row', 'col'])
@Index(['subjectId', 'topic'])
export class SkillNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_id' })
  @Index()
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ length: 200 })
  topic: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ name: 'icon_key', length: 50, default: 'star' })
  iconKey: string;

  @Column({ name: 'xp_threshold', default: 100 })
  xpThreshold: number;

  @Column({ name: 'prerequisite_ids', type: 'jsonb', default: [] })
  prerequisiteIds: string[];

  @Column({ type: 'smallint', default: 0 })
  col: number;

  @Column({ type: 'smallint', default: 0 })
  row: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
