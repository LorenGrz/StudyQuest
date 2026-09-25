/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Party } from '../parties/party.entity';
import { Subject } from '../subjects/subject.entity';
import { User } from '../users/user.entity';
import { QuizQuestion } from './quiz-question.entity';
import { PlayerResult } from './player-result.entity';

export type QuestStatus =
  | 'generating'
  | 'ready'
  | 'active'
  | 'completed'
  | 'failed';

@Entity('quests')
@Index(['partyId', 'status', 'createdAt'])
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ name: 'party_id' })
  @Index()
  partyId: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @ManyToOne(() => Party, (p) => p.quests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({
    type: 'enum',
    enum: ['generating', 'ready', 'active', 'completed', 'failed'],
    default: 'generating',
  })
  @Index()
  status: QuestStatus;

  @Column({ name: 'source_text', type: 'text', nullable: true, select: false })
  sourceText: string | null;

  @Column({
    name: 'source_pdf_url',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  sourcePdfUrl: string | null;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
    default: null,
  })
  errorMessage: string | null;

  @Column({
    name: 'started_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  startedAt: Date | null;

  @Column({
    name: 'completed_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  completedAt: Date | null;

  @OneToMany(() => QuizQuestion, (q) => q.quest, { cascade: true })
  questions: QuizQuestion[];

  @OneToMany(() => PlayerResult, (r) => r.quest, { cascade: true })
  results: PlayerResult[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
