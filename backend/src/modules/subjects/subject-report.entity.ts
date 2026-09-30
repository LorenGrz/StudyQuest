import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Subject } from './subject.entity';

import type { SubjectReportReason } from './subject-report-reasons';

/**
 * POST /subjects/:id/report. One row per (subject, user): reporting twice is
 * a no-op, so the auto-hide threshold counts distinct users. Created by the
 * SubjectReports migration; names match it so `synchronize` is a no-op.
 */
@Entity('subject_reports')
@Unique('UQ_subject_reports_subject_user', ['subjectId', 'userId'])
export class SubjectReport {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_subject_reports',
  })
  id: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'subject_id',
    foreignKeyConstraintName: 'FK_subject_reports_subject_id',
  })
  subject: Subject | null;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('IDX_subject_reports_user_id')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_subject_reports_user_id',
  })
  user: User | null;

  @Column({ type: 'varchar', length: 16, default: 'other' })
  reason: SubjectReportReason;

  @Column({ type: 'varchar', length: 300, nullable: true, default: null })
  details: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
