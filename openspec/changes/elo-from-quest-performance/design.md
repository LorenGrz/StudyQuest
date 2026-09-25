# Design: ELO progression ladder from quest performance

## Context

- ELO math already exists in `backend/src/common/leagues.ts`: `expectedScore`,
  `calculateEloDeltas` (multiplayer), `getLeague`, `LEAGUES`, `DEFAULT_ELO`,
  `ELO_K_FACTOR`.
- `usersService.updateElo(userId, delta)` persists to `stats.elo`, clamps
  `>= 0`, and emits `user.elo_updated` only when `delta > 0`.
- League medals `LEAGUE_*` (keyed by `minElo`) are evaluated by
  `achievements.service.ts` on the `quest.completed` event.
- `completeQuest` already computes `accuracy` and already has an
  `attemptNumber === 1` branch that awards XP and updates the streak.

## Goals / Non-goals

- Goal: ELO starts at 0 and climbs (or dips) with real quest performance, gated
  by question difficulty; league medals awarded on threshold crossings.
- Non-goal: multiplayer ELO (`calculateEloDeltas` stays untouched), XP/level/coin
  changes, new schema columns.

## Decision 1 — Start the ladder at 0

Set `DEFAULT_ELO = 0` in `leagues.ts`. Because entity defaults, seeds,
matchmaking, and `users.service` fallbacks all import this constant (or should),
the change propagates from one place. A one-off migration resets existing users'
`stats.elo` to `0`.

Trade-off: a brand-new/unlucky user can sit at `0` (Hierro) — that is the point;
the climb must be earned. `updateElo` already clamps at `0`, so ELO never goes
negative.

## Decision 2 — Solo ELO delta formula

Reuse the real ELO formula with **accuracy as the actual score** (continuous
0..1) against a **virtual opponent** representing the quest's difficulty:

```
expected = expectedScore(currentElo, questRating)   // existing helper
delta    = round(ELO_K_FACTOR * (accuracy - expected))
newElo   = max(0, currentElo + delta)               // updateElo clamps
```

- `accuracy` = `correctAnswers / totalQuestions` (already computed in
  `completeQuest`).
- Self-balancing: you gain while `accuracy > expected`, lose while below, and
  gains shrink to ~0 as your ELO climbs far above the quest's rating (perfect
  play plateaus a few hundred points above `questRating`).

New pure helper in `leagues.ts`:

```ts
export function calculateSoloEloDelta(
  currentElo: number,
  accuracy: number,      // 0..1
  questRating: number,
): number {
  const expected = expectedScore(currentElo, questRating);
  return Math.round(ELO_K_FACTOR * (accuracy - expected));
}
```

## Decision 3 — Difficulty gates the climb

Map each question's difficulty to an opponent rating aligned with the league
ladder, then average across the quest's questions:

```ts
export const DIFFICULTY_RATINGS: Record<Difficulty, number> = {
  easy: 400,     // caps solo climb around Plata/Oro
  medium: 1200,  // caps around Platino
  hard: 2000,    // needed to reach Diamante / QuestMaster
};

export function questRatingFromDifficulties(difficulties: Difficulty[]): number {
  if (!difficulties.length) return DIFFICULTY_RATINGS.medium;
  const sum = difficulties.reduce((a, d) => a + DIFFICULTY_RATINGS[d], 0);
  return Math.round(sum / difficulties.length);
}
```

Result: easy quests carry a new user up through the low leagues but plateau;
reaching the top leagues requires consistently acing hard material. The three
rating constants and `ELO_K_FACTOR` are the tuning knobs.

Calibration sketch (steady accuracy `a` on quests of rating `R` settles ELO
around `R + 400·log10(a/(1-a))`):

| Quest content | Rating R | Plateau at a≈0.9 | League reached |
|---------------|----------|------------------|----------------|
| easy          | 400      | ~780             | Plata          |
| medium        | 1200     | ~1580            | Platino        |
| hard          | 2000     | ~2380            | Diamante→QM    |

## Decision 4 — Ordering so medals are awarded correctly

In `completeQuest`, call `updateElo` **before** the `quest.completed` event is
emitted, so the achievements service sees the updated `stats.elo` when it
re-evaluates the `LEAGUE_*` thresholds. Medals are permanent and never revoked on
a later ELO drop (achievements are not removed).

## Decision 5 — Surface the delta

Extend the `completeQuest` response with `eloDelta` and `eloAfter` (and optionally
`league`) for UX. The profile league/ELO display already reads `stats.elo`, so it
updates without frontend changes; the delta is optional polish.

## Risks

- **Mis-calibration** (climb too fast/slow): mitigated by keeping ratings and
  K-factor as named constants; adjust after observing real data.
- **`DEFAULT_ELO` fan-out**: some spots may hardcode `1200` instead of importing
  the constant — the tasks include an audit of every usage.
- **Question difficulty not loaded** in `completeQuest`'s quest fetch: ensure the
  questions relation includes `difficulty`, else fall back to `medium`.
- **Negative-delta event gap**: `updateElo` emits `user.elo_updated` only on
  `delta > 0`; league medals do not depend on it (they re-evaluate on
  `quest.completed`), so no change needed — noted so it is not "fixed" by mistake.
