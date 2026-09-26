import { QuizContentDoc } from './quiz-content.types';

/**
 * Storage port for quiz content. Also the Nest DI token: inject it by class
 * (`constructor(private readonly quizContent: QuizContentRepository)`).
 *
 * - `DynamoQuizContentRepository` is the runtime implementation.
 * - `InMemoryQuizContentRepository` backs unit tests.
 */
export abstract class QuizContentRepository {
  /** Upsert the whole document (put semantics — idempotent). */
  abstract save(doc: QuizContentDoc): Promise<void>;

  abstract get(questId: string): Promise<QuizContentDoc | null>;

  /** Missing ids are simply absent from the returned map. */
  abstract batchGet(questIds: string[]): Promise<Map<string, QuizContentDoc>>;

  abstract delete(questId: string): Promise<void>;

  abstract deleteMany(questIds: string[]): Promise<void>;
}
