import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_options')
@Index(['questionId', 'position'])
export class QuizOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => QuizQuestion, (q) => q.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;

  @Column({ type: 'smallint' })
  position: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean;
}
