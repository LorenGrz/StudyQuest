import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Quest } from './quest.entity';
import { User } from '../users/user.entity';

@Entity('player_results')
@Unique(['questId', 'userId'])
@Index(['questId', 'score'])
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

  @Column({ default: 0 })
  score: number;

  @Column({ name: 'correct_answers', default: 0 })
  correctAnswers: number;

  @Column({ name: 'xp_earned', default: 0 })
  xpEarned: number;

  @Column({ name: 'total_time_ms', default: 0 })
  totalTimeMs: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
