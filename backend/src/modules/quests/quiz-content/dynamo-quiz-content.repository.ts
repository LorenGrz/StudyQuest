import { Logger } from '@nestjs/common';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { QuizContentRepository } from './quiz-content.repository';
import { QuizContentDoc } from './quiz-content.types';

/** DynamoDB hard limits per request. */
export const BATCH_GET_MAX_KEYS = 100;
export const BATCH_WRITE_MAX_ITEMS = 25;
/** Retries for UnprocessedKeys / UnprocessedItems (throttling). */
const MAX_UNPROCESSED_RETRIES = 5;
const RETRY_BASE_MS = 50;

type Key = { questId: string };

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export class DynamoQuizContentRepository extends QuizContentRepository {
  private readonly logger = new Logger(DynamoQuizContentRepository.name);

  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {
    super();
  }

  async save(item: QuizContentDoc): Promise<void> {
    await this.doc.send(
      new PutCommand({ TableName: this.tableName, Item: item }),
    );
  }

  async get(questId: string): Promise<QuizContentDoc | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { questId },
        // Read right after generation writes it; strong reads avoid a stale miss.
        ConsistentRead: true,
      }),
    );
    return (res.Item as QuizContentDoc | undefined) ?? null;
  }

  async batchGet(questIds: string[]): Promise<Map<string, QuizContentDoc>> {
    const found = new Map<string, QuizContentDoc>();
    const unique = [...new Set(questIds)];

    for (const ids of chunk(unique, BATCH_GET_MAX_KEYS)) {
      let keys: Key[] = ids.map((questId) => ({ questId }));

      for (let attempt = 0; keys.length > 0; attempt++) {
        if (attempt > MAX_UNPROCESSED_RETRIES) {
          throw new Error(
            `DynamoDB batchGet: ${keys.length} keys left unprocessed after retries`,
          );
        }
        if (attempt > 0) await sleep(RETRY_BASE_MS * 2 ** attempt);

        const res = await this.doc.send(
          new BatchGetCommand({
            RequestItems: { [this.tableName]: { Keys: keys } },
          }),
        );
        for (const item of res.Responses?.[this.tableName] ?? []) {
          const docItem = item as QuizContentDoc;
          found.set(docItem.questId, docItem);
        }
        keys = (res.UnprocessedKeys?.[this.tableName]?.Keys ?? []) as Key[];
      }
    }

    return found;
  }

  async delete(questId: string): Promise<void> {
    await this.doc.send(
      new DeleteCommand({ TableName: this.tableName, Key: { questId } }),
    );
  }

  async deleteMany(questIds: string[]): Promise<void> {
    const unique = [...new Set(questIds)];

    for (const ids of chunk(unique, BATCH_WRITE_MAX_ITEMS)) {
      let requests = ids.map((questId) => ({
        DeleteRequest: { Key: { questId } as Record<string, unknown> },
      }));

      for (let attempt = 0; requests.length > 0; attempt++) {
        if (attempt > MAX_UNPROCESSED_RETRIES) {
          this.logger.warn(
            `deleteMany: ${requests.length} deletes unprocessed; TTL will clean them up`,
          );
          break;
        }
        if (attempt > 0) await sleep(RETRY_BASE_MS * 2 ** attempt);

        const res = await this.doc.send(
          new BatchWriteCommand({
            RequestItems: { [this.tableName]: requests },
          }),
        );
        requests = (res.UnprocessedItems?.[this.tableName] ??
          []) as typeof requests;
      }
    }
  }
}
