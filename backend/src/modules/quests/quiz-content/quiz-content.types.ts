/**
 * Quiz content (questions + options) lives in one DynamoDB document per quest.
 * Postgres keeps only the Quest metadata (incl. `questionCount`) and the
 * PlayerResults. These types are the document shape; the `id` fields are kept
 * so the API keeps returning stable question/option ids (the frontend uses
 * option ids as React keys and to map a click back to its index).
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuizOptionDoc {
  id: string;
  position: number;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionDoc {
  id: string;
  position: number;
  text: string;
  explanation: string;
  topic: string | null;
  difficulty: Difficulty;
  correctIndex: number;
  options: QuizOptionDoc[];
}

export interface QuizContentDoc {
  /** Partition key — same uuid as `quests.id`. */
  questId: string;
  questions: QuizQuestionDoc[];
  questionCount: number;
  /** ISO timestamp. */
  createdAt: string;
  /** Epoch seconds; DynamoDB TTL attribute (safety net behind retention). */
  expiresAt: number;
}
