import { Quest } from './quest.entity';
import { QuizOption } from './quiz-option.entity';
export type Difficulty = 'easy' | 'medium' | 'hard';
export declare class QuizQuestion {
    id: string;
    questId: string;
    quest: Quest;
    position: number;
    text: string;
    correctIndex: number;
    explanation: string;
    topic: string;
    difficulty: Difficulty;
    options: QuizOption[];
}
