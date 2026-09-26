import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { InMemoryQuizContentRepository } from './in-memory-quiz-content.repository';
import { DynamoQuizContentRepository } from './dynamo-quiz-content.repository';
import { QuizContentRepository } from './quiz-content.repository';
import {
  buildQuizContentDoc,
  contentTtlDays,
  sortedQuestions,
  TTL_GRACE_DAYS,
} from './quiz-content.utils';
import { resolveDynamoSettings } from './dynamo.config';
import { QuizContentDoc } from './quiz-content.types';

const raw = (text: string) => ({
  text,
  options: ['A', 'B', 'C'],
  correctIndex: 1,
  explanation: 'porque',
  topic: 'Tema',
  difficulty: 'medium' as const,
});

const doc = (questId: string): QuizContentDoc =>
  buildQuizContentDoc(questId, [raw('uno?'), raw('dos?')]);

describe('InMemoryQuizContentRepository', () => {
  let repo: InMemoryQuizContentRepository;

  beforeEach(() => {
    repo = new InMemoryQuizContentRepository();
  });

  it('is a QuizContentRepository (usable as the DI token)', () => {
    expect(repo).toBeInstanceOf(QuizContentRepository);
  });

  it('saves, gets and overwrites a document (put semantics)', async () => {
    const first = doc('q1');
    await repo.save(first);
    expect(await repo.get('q1')).toEqual(first);

    const second = { ...first, questionCount: 99 };
    await repo.save(second);
    expect((await repo.get('q1'))?.questionCount).toBe(99);
    expect(repo.size()).toBe(1);
  });

  it('returns null for a missing document', async () => {
    expect(await repo.get('nope')).toBeNull();
  });

  it('isolates stored documents from caller mutation', async () => {
    const d = doc('q1');
    await repo.save(d);
    d.questions[0].text = 'mutated';
    const read = await repo.get('q1');
    read!.questions[1].text = 'mutated too';

    const again = await repo.get('q1');
    expect(again!.questions[0].text).toBe('uno?');
    expect(again!.questions[1].text).toBe('dos?');
  });

  it('batchGets only existing ids, deduplicated', async () => {
    await repo.save(doc('a'));
    await repo.save(doc('b'));

    const found = await repo.batchGet(['a', 'b', 'a', 'missing']);

    expect([...found.keys()].sort()).toEqual(['a', 'b']);
  });

  it('deletes one and many', async () => {
    await repo.save(doc('a'));
    await repo.save(doc('b'));
    await repo.save(doc('c'));

    await repo.delete('a');
    await repo.deleteMany(['b', 'missing']);

    expect(await repo.get('a')).toBeNull();
    expect(await repo.get('b')).toBeNull();
    expect(await repo.get('c')).not.toBeNull();
  });
});

describe('buildQuizContentDoc', () => {
  it('assigns unique ids, positions, isCorrect and TTL', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const d = buildQuizContentDoc(
      'q1',
      [raw('uno?'), raw('dos?')],
      createdAt,
      9,
    );

    expect(d.questId).toBe('q1');
    expect(d.questionCount).toBe(2);
    expect(d.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(d.expiresAt).toBe(createdAt.getTime() / 1000 + 9 * 86400);
    expect(d.questions.map((q) => q.position)).toEqual([0, 1]);
    expect(d.questions[0].options.map((o) => o.isCorrect)).toEqual([
      false,
      true,
      false,
    ]);
    const ids = d.questions.flatMap((q) => [
      q.id,
      ...q.options.map((o) => o.id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('TTL = QUEST_RETENTION_DAYS (default 30) + grace', () => {
    expect(contentTtlDays(undefined)).toBe(30 + TTL_GRACE_DAYS);
    expect(contentTtlDays('7')).toBe(7 + TTL_GRACE_DAYS);
    expect(contentTtlDays('garbage')).toBe(30 + TTL_GRACE_DAYS);
  });

  it('sortedQuestions orders by position and tolerates null', () => {
    const d = doc('q1');
    d.questions.reverse();
    expect(sortedQuestions(d).map((q) => q.position)).toEqual([0, 1]);
    expect(sortedQuestions(null)).toEqual([]);
  });
});

describe('resolveDynamoSettings', () => {
  it('uses defaults and trims env values', () => {
    expect(resolveDynamoSettings(() => undefined)).toEqual({
      tableName: 'studyquest-quizzes',
      region: 'us-east-1',
      endpoint: undefined,
    });
    const env: Record<string, string> = {
      DYNAMO_QUIZZES_TABLE: ' t ',
      AWS_REGION: 'sa-east-1',
      DYNAMO_ENDPOINT: 'http://localhost:8000',
    };
    expect(resolveDynamoSettings((k) => env[k])).toEqual({
      tableName: 't',
      region: 'sa-east-1',
      endpoint: 'http://localhost:8000',
    });
  });
});

describe('DynamoQuizContentRepository', () => {
  const TABLE = 'studyquest-quizzes';
  let send: jest.Mock;
  let repo: DynamoQuizContentRepository;

  beforeEach(() => {
    send = jest.fn();
    repo = new DynamoQuizContentRepository(
      { send } as unknown as DynamoDBDocumentClient,
      TABLE,
    );
  });

  it('puts, gets (consistent) and deletes by questId', async () => {
    const d = doc('q1');
    send.mockResolvedValueOnce({});
    await repo.save(d);
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutCommand);
    expect(send.mock.calls[0][0].input).toEqual({ TableName: TABLE, Item: d });

    send.mockResolvedValueOnce({ Item: d });
    expect(await repo.get('q1')).toEqual(d);
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetCommand);
    expect(send.mock.calls[1][0].input).toEqual({
      TableName: TABLE,
      Key: { questId: 'q1' },
      ConsistentRead: true,
    });

    send.mockResolvedValueOnce({});
    expect(await repo.get('missing')).toBeNull();

    send.mockResolvedValueOnce({});
    await repo.delete('q1');
    expect(send.mock.calls[3][0]).toBeInstanceOf(DeleteCommand);
    expect(send.mock.calls[3][0].input).toEqual({
      TableName: TABLE,
      Key: { questId: 'q1' },
    });
  });

  it('batchGet chunks by 100 keys and dedupes ids', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `q${i}`);
    send.mockImplementation((cmd: BatchGetCommand) => {
      const keys = cmd.input.RequestItems![TABLE].Keys as {
        questId: string;
      }[];
      return Promise.resolve({
        Responses: { [TABLE]: keys.map((k) => ({ questId: k.questId })) },
      });
    });

    const found = await repo.batchGet([...ids, 'q0', 'q1']);

    expect(send).toHaveBeenCalledTimes(3);
    const sizes = send.mock.calls.map(
      ([cmd]) =>
        (cmd as BatchGetCommand).input.RequestItems![TABLE].Keys!.length,
    );
    expect(sizes).toEqual([100, 100, 50]);
    expect(found.size).toBe(250);
  });

  it('batchGet retries UnprocessedKeys', async () => {
    send
      .mockResolvedValueOnce({
        Responses: { [TABLE]: [{ questId: 'a' }] },
        UnprocessedKeys: { [TABLE]: { Keys: [{ questId: 'b' }] } },
      })
      .mockResolvedValueOnce({ Responses: { [TABLE]: [{ questId: 'b' }] } });

    const found = await repo.batchGet(['a', 'b']);

    expect(send).toHaveBeenCalledTimes(2);
    expect(
      (send.mock.calls[1][0] as BatchGetCommand).input.RequestItems![TABLE]
        .Keys,
    ).toEqual([{ questId: 'b' }]);
    expect([...found.keys()].sort()).toEqual(['a', 'b']);
  });

  it('batchGet with no ids does not call DynamoDB', async () => {
    expect((await repo.batchGet([])).size).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('deleteMany chunks by 25 and retries UnprocessedItems', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `q${i}`);
    send
      .mockResolvedValueOnce({
        UnprocessedItems: {
          [TABLE]: [{ DeleteRequest: { Key: { questId: 'q3' } } }],
        },
      })
      .mockResolvedValue({});

    await repo.deleteMany(ids);

    const calls = send.mock.calls.map(([cmd]) => cmd as BatchWriteCommand);
    expect(calls.every((c) => c instanceof BatchWriteCommand)).toBe(true);
    expect(calls.map((c) => c.input.RequestItems![TABLE].length)).toEqual([
      25, 1, 5,
    ]);
    expect(calls[1].input.RequestItems![TABLE][0]).toEqual({
      DeleteRequest: { Key: { questId: 'q3' } },
    });
  });
});
