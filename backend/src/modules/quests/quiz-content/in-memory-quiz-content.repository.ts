import { QuizContentRepository } from './quiz-content.repository';
import { QuizContentDoc } from './quiz-content.types';

/** Test double: same contract as the DynamoDB repository, kept in a Map.
 * Documents are deep-cloned in and out so callers cannot mutate storage. */
export class InMemoryQuizContentRepository extends QuizContentRepository {
  private readonly items = new Map<string, QuizContentDoc>();

  save(doc: QuizContentDoc): Promise<void> {
    this.items.set(doc.questId, structuredClone(doc));
    return Promise.resolve();
  }

  get(questId: string): Promise<QuizContentDoc | null> {
    const doc = this.items.get(questId);
    return Promise.resolve(doc ? structuredClone(doc) : null);
  }

  batchGet(questIds: string[]): Promise<Map<string, QuizContentDoc>> {
    const found = new Map<string, QuizContentDoc>();
    for (const id of new Set(questIds)) {
      const doc = this.items.get(id);
      if (doc) found.set(id, structuredClone(doc));
    }
    return Promise.resolve(found);
  }

  delete(questId: string): Promise<void> {
    this.items.delete(questId);
    return Promise.resolve();
  }

  deleteMany(questIds: string[]): Promise<void> {
    for (const id of questIds) this.items.delete(id);
    return Promise.resolve();
  }

  /** Test helper. */
  size(): number {
    return this.items.size;
  }
}
