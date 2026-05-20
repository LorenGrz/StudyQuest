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
import { Quest } from './quest.entity';
import { User } from '../users/user.entity';

@Entity('player_results')
@Index(['questId', 'score'])
@Index(['questId', 'userId', 'attemptNumber'], { unique: true })
export class PlayerResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quest_id' })
  questId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Quest, (q) => q.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quest_id' })
  quest: Quest;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'attempt_number', default: 1 })
  attemptNumber: number;

  @Column({
    type: 'enum',
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
  })
  status: 'in_progress' | 'completed' | 'abandoned';

  @Column({ default: 0 })
  score: number;

  @Column({ name: 'correct_answers', default: 0 })
  correctAnswers: number;

  @Column({ name: 'total_questions', default: 0 })
  totalQuestions: number;

  @Column({ name: 'xp_earned', default: 0 })
  xpEarned: number;

  @Column({ name: 'total_time_ms', default: 0 })
  totalTimeMs: number;

  @Column({
    name: 'answered_question_indices',
    type: 'simple-json',
    nullable: true,
  })
  answeredQuestionIndices: number[] | null;

  @Column({
    name: 'completed_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
