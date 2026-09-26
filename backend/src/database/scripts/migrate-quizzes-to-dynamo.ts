/**
 * One-off: copy quiz content from Postgres (quiz_questions + quiz_options) to
 * DynamoDB, one document per quest, and backfill quests.question_count.
 *
 * Usage (from backend/):
 *   pnpm run migrate:quizzes-dynamo -- --dry-run   # read + report only
 *   pnpm run migrate:quizzes-dynamo                # write
 *
 * - Idempotent: question/option ids are preserved from Postgres and the put
 *   overwrites the whole item, so re-running produces the same documents.
 * - Only uses GetItem/PutItem/BatchGetItem (no Scan/DescribeTable), matching
 *   the app's IAM policy.
 * - Prints verification counts and exits non-zero on mismatch.
 * - Requires the `question_count` column (run the AddQuestQuestionCount
 *   migration, or boot the app once with TYPEORM_SYNC=true) unless --dry-run.
 */
import '../../polyfill';
import { config } from 'dotenv';
config({ path: '../.env' });

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { postgresConnectionOptions } from '../../config/postgres-connection';
import {
  createDynamoClient,
  createDynamoDocumentClient,
  resolveDynamoSettings,
} from '../../modules/quests/quiz-content/dynamo.config';
import { DynamoQuizContentRepository } from '../../modules/quests/quiz-content/dynamo-quiz-content.repository';
import {
  contentTtlDays,
  expiresAtFor,
} from '../../modules/quests/quiz-content/quiz-content.utils';
import {
  Difficulty,
  QuizContentDoc,
  QuizQuestionDoc,
} from '../../modules/quests/quiz-content/quiz-content.types';

const QUEST_BATCH = 100;

interface QuestRow {
  id: string;
  created_at: Date;
}
interface QuestionRow {
  id: string;
  quest_id: string;
  position: number;
  text: string;
  correct_index: number;
  explanation: string;
  topic: string | null;
  difficulty: Difficulty;
}
interface OptionRow {
  id: string;
  question_id: string;
  position: number;
  text: string;
  is_correct: boolean;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function buildDocs(
  quests: QuestRow[],
  questions: QuestionRow[],
  options: OptionRow[],
  ttlDays: number,
): QuizContentDoc[] {
  const optionsByQuestion = new Map<string, OptionRow[]>();
  for (const o of options) {
    const list = optionsByQuestion.get(o.question_id) ?? [];
    list.push(o);
    optionsByQuestion.set(o.question_id, list);
  }
  const questionsByQuest = new Map<string, QuizQuestionDoc[]>();
  for (const q of questions) {
    const list = questionsByQuest.get(q.quest_id) ?? [];
    list.push({
      id: q.id,
      position: Number(q.position),
      text: q.text,
      explanation: q.explanation,
      topic: q.topic,
      difficulty: q.difficulty,
      correctIndex: Number(q.correct_index),
      options: (optionsByQuestion.get(q.id) ?? [])
        .sort((a, b) => Number(a.position) - Number(b.position))
        .map((o) => ({
          id: o.id,
          position: Number(o.position),
          text: o.text,
          isCorrect: Boolean(o.is_correct),
        })),
    });
    questionsByQuest.set(q.quest_id, list);
  }

  return quests.map((quest) => {
    const createdAt = new Date(quest.created_at);
    const qs = (questionsByQuest.get(quest.id) ?? []).sort(
      (a, b) => a.position - b.position,
    );
    return {
      questId: quest.id,
      questions: qs,
      questionCount: qs.length,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAtFor(createdAt, ttlDays),
    };
  });
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const ttlDays = contentTtlDays();
  const settings = resolveDynamoSettings();
  const repo = new DynamoQuizContentRepository(
    createDynamoDocumentClient(createDynamoClient(settings)),
    settings.tableName,
  );

  const pg = new DataSource({
    type: 'postgres',
    ...postgresConnectionOptions(),
    synchronize: false,
    logging: false,
  });
  await pg.initialize();

  try {
    const hasColumn = await pg.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'quests' AND column_name = 'question_count'`,
    );
    if (!dryRun && hasColumn.length === 0) {
      throw new Error(
        'quests.question_count does not exist. Run the AddQuestQuestionCount migration first.',
      );
    }

    const quests: QuestRow[] = await pg.query(
      `SELECT q.id, q.created_at
       FROM quests q
       WHERE EXISTS (SELECT 1 FROM quiz_questions qq WHERE qq.quest_id = q.id)
       ORDER BY q.created_at`,
    );
    const [pgTotals] = await pg.query(
      `SELECT
         (SELECT COUNT(*)::int FROM quiz_questions) AS questions,
         (SELECT COUNT(*)::int FROM quiz_options) AS options`,
    );

    console.log(
      `[migrate-quizzes] table=${settings.tableName} region=${settings.region}` +
        `${settings.endpoint ? ` endpoint=${settings.endpoint}` : ''}` +
        ` ttlDays=${ttlDays} dryRun=${dryRun}`,
    );
    console.log(
      `[migrate-quizzes] Postgres: ${quests.length} quests with questions, ` +
        `${pgTotals.questions} questions, ${pgTotals.options} options`,
    );

    let written = 0;
    let processed = 0;
    let writtenQuestions = 0;
    let writtenOptions = 0;

    for (const batch of chunk(quests, QUEST_BATCH)) {
      processed += batch.length;
      const ids = batch.map((q) => q.id);
      const questions: QuestionRow[] = await pg.query(
        `SELECT id, quest_id, position, text, correct_index, explanation,
                topic, difficulty
         FROM quiz_questions WHERE quest_id = ANY($1)`,
        [ids],
      );
      const options: OptionRow[] = await pg.query(
        `SELECT o.id, o.question_id, o.position, o.text, o.is_correct
         FROM quiz_options o
         JOIN quiz_questions qq ON qq.id = o.question_id
         WHERE qq.quest_id = ANY($1)`,
        [ids],
      );

      for (const doc of buildDocs(batch, questions, options, ttlDays)) {
        writtenQuestions += doc.questionCount;
        writtenOptions += doc.questions.reduce(
          (n, q) => n + q.options.length,
          0,
        );
        if (dryRun) continue;
        await repo.save(doc);
        await pg.query(`UPDATE quests SET question_count = $1 WHERE id = $2`, [
          doc.questionCount,
          doc.questId,
        ]);
        written += 1;
      }
      console.log(
        `[migrate-quizzes] processed ${processed}/${quests.length} quests`,
      );
    }

    if (dryRun) {
      console.log(
        `[migrate-quizzes] DRY RUN: would write ${quests.length} items ` +
          `(${writtenQuestions} questions, ${writtenOptions} options). Nothing written.`,
      );
      return;
    }

    // Verify by reading back what we wrote.
    const readBack = await repo.batchGet(quests.map((q) => q.id));
    let dynamoQuestions = 0;
    let dynamoOptions = 0;
    for (const doc of readBack.values()) {
      dynamoQuestions += doc.questions.length;
      dynamoOptions += doc.questions.reduce((n, q) => n + q.options.length, 0);
    }
    const [pgCount] = await pg.query(
      `SELECT COALESCE(SUM(question_count), 0)::int AS total
       FROM quests WHERE id = ANY($1)`,
      [quests.map((q) => q.id)],
    );

    const rows = [
      [
        'quests with questions (PG) vs items (Dynamo)',
        quests.length,
        readBack.size,
      ],
      ['total questions (PG) vs (Dynamo)', pgTotals.questions, dynamoQuestions],
      ['total options (PG) vs (Dynamo)', pgTotals.options, dynamoOptions],
      [
        'sum quests.question_count vs Dynamo questions',
        pgCount.total,
        dynamoQuestions,
      ],
    ] as const;
    let ok = true;
    for (const [label, a, b] of rows) {
      const match = Number(a) === Number(b);
      ok &&= match;
      console.log(`[verify] ${match ? 'OK  ' : 'FAIL'} ${label}: ${a} vs ${b}`);
    }
    if (!ok) {
      process.exitCode = 1;
      console.error('[migrate-quizzes] verification FAILED');
    } else {
      console.log(
        `[migrate-quizzes] done: ${written} items written and verified`,
      );
    }
  } finally {
    await pg.destroy();
  }
}

main().catch((err) => {
  console.error('[migrate-quizzes] failed:', err);
  process.exit(1);
});
