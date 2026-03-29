import { QuizQuestion } from './quiz-question.entity';
export declare class QuizOption {
    id: string;
    questionId: string;
    question: QuizQuestion;
    position: number;
    text: string;
    isCorrect: boolean;
}
