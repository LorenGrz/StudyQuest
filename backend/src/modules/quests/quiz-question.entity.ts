import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Quest } from './quest.entity';
import { QuizOption } from './quiz-option.entity';

export type Difficulty = 'easy' | 'medium' | 'hard';

@Entity('quiz_questions')
@Index(['questId', 'position'])
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quest_id' })
  questId: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @ManyToOne(() => Quest, (q) => q.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quest_id' })
  quest: Quest;

  @Column({ type: 'smallint' })
  position: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'correct_index', type: 'smallint' })
  correctIndex: number;

  @Column({ type: 'text' })
  explanation: string;

  @Column({ length: 200, nullable: true })
  topic: string;

  @Column({ type: 'enum', enum: ['easy', 'medium', 'hard'], default: 'medium' })
  difficulty: Difficulty;

  @OneToMany(() => QuizOption, (o) => o.question, {
    cascade: true,
    eager: true,
  })
  options: QuizOption[];
}
