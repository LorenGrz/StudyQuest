import { PlayerResult } from '../quests/player-result.entity';

/** Minimal shape this module needs from a completed `PlayerResult`, with its
 * `quest` (and `quest.subject` / `quest.questions`) relations loaded. Kept
 * narrow so the formatter is easy to unit test with plain fixtures. */
export type CompletedResultWithQuest = Pick<
  PlayerResult,
  'correctAnswers' | 'totalQuestions' | 'completedAt'
> & {
  quest: {
    title: string;
    subject?: { name: string } | null;
    questions?: Array<{
      topic: string | null;
      text: string;
      explanation: string;
    }> | null;
  } | null;
};

/** How many questions per quest we include in the context — enough to cover a
 * 10-question quiz without letting one quest crowd out the rest. */
const MAX_QUESTIONS_PER_QUEST = 10;

/**
 * Turns the user's own recent quest history into the text block the study
 * bot's prompt is grounded in. This *is* the "retrieval" step: no embeddings
 * or vector search, just a query already scoped to `userId` — the account's
 * data is small enough that fetching the last few results is the whole index.
 *
 * Note: `PlayerResult` only stores an aggregate `correctAnswers` count, not
 * which specific questions were right or wrong, so we can report "80% en
 * Termodinámica" but not "fallaste la pregunta sobre entropía".
 */
export function formatQuestHistory(
  results: CompletedResultWithQuest[],
): string {
  if (results.length === 0) {
    return 'El usuario todavía no completó ningún quest.';
  }

  return results
    .map((r) => {
      const quest = r.quest;
      const title = quest?.title ?? 'Quest sin título';
      const subject = quest?.subject?.name ?? 'materia desconocida';
      const pct =
        r.totalQuestions > 0
          ? Math.round((r.correctAnswers / r.totalQuestions) * 100)
          : 0;
      const date = r.completedAt
        ? new Date(r.completedAt).toISOString().slice(0, 10)
        : 'fecha desconocida';

      const header = `Quest "${title}" (${subject}) — ${r.correctAnswers}/${r.totalQuestions} correctas (${pct}%), completado el ${date}`;

      const questionLines = (quest?.questions ?? [])
        .slice(0, MAX_QUESTIONS_PER_QUEST)
        .map(
          (q) => `  - [${q.topic || 'general'}] ${q.text} → ${q.explanation}`,
        )
        .join('\n');

      return questionLines ? `${header}\n${questionLines}` : header;
    })
    .join('\n\n');
}
