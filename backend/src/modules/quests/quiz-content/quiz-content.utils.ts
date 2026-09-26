import { randomUUID } from 'node:crypto';
import { RawQuestion } from '../../ai/ai.types';
import { QuizContentDoc, QuizQuestionDoc } from './quiz-content.types';

const DAY_SECONDS = 24 * 60 * 60;
/** Used when QUEST_RETENTION_DAYS is unset. */
export const DEFAULT_CONTENT_RETENTION_DAYS = 30;
/** Extra days past the Postgres retention window before DynamoDB TTL may
 * drop the document. Postgres retention runs once a day (and on cold start),
 * so the quest row can outlive `createdAt + retention` by up to ~a day; the
 * grace avoids a quest row that still exists but whose content is gone. */
export const TTL_GRACE_DAYS = 2;

export function contentTtlDays(
  raw: string | undefined = process.env.QUEST_RETENTION_DAYS,
): number {
  const parsed = Number(raw);
  const retention =
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_CONTENT_RETENTION_DAYS;
  return retention + TTL_GRACE_DAYS;
}

export function expiresAtFor(createdAt: Date, ttlDays = contentTtlDays()) {
  return Math.floor(createdAt.getTime() / 1000) + ttlDays * DAY_SECONDS;
}

/** Builds the DynamoDB document for freshly generated questions, assigning
 * new uuids to every question and option (same contract as the old
 * `quiz_questions.id` / `quiz_options.id` columns). */
export function buildQuizContentDoc(
  questId: string,
  rawQuestions: RawQuestion[],
  createdAt: Date = new Date(),
  ttlDays = contentTtlDays(),
): QuizContentDoc {
  const questions: QuizQuestionDoc[] = rawQuestions.map((raw, i) => ({
    id: randomUUID(),
    position: i,
    text: raw.text,
    explanation: raw.explanation,
    topic: raw.topic ?? null,
    difficulty: raw.difficulty ?? 'medium',
    correctIndex: raw.correctIndex,
    options: raw.options.map((text, j) => ({
      id: randomUUID(),
      position: j,
      text,
      isCorrect: j === raw.correctIndex,
    })),
  }));

  return {
    questId,
    questions,
    questionCount: questions.length,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAtFor(createdAt, ttlDays),
  };
}

/** Questions sorted by position (DynamoDB keeps list order, but the old
 * relational reads always sorted explicitly — keep that guarantee). */
export function sortedQuestions(
  doc: QuizContentDoc | null | undefined,
): QuizQuestionDoc[] {
  return [...(doc?.questions ?? [])].sort((a, b) => a.position - b.position);
}
