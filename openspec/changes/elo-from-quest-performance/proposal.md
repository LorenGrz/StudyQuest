# Change: ELO progression ladder from quest performance

## Why

Two progression systems live in `User.stats`, but only one runs:

- **XP** works end to end. On the first attempt of a completed quest,
  `completeQuest` awards XP via `usersService.addXp` and updates the streak
  (`backend/src/modules/quests/quests.service.ts:450-453`).
- **ELO** is fully scaffolded but never triggered. The math helpers
  (`expectedScore`, `calculateEloDeltas`), the constants
  (`DEFAULT_ELO = 1200`, `ELO_K_FACTOR = 32`), the persistence method
  (`updateElo`, which clamps to `>= 0` and emits `user.elo_updated`), the 7
  leagues, the leaderboards, the profile UI, and even the **league medals**
  (`LEAGUE_*` achievements keyed by `minElo` in `achievements.service.ts`, which
  re-evaluate on `quest.completed`) all exist — but no code path ever calls
  `updateElo`. So a user's ELO is frozen and no league medal is ever earned.

There is also a **design flaw** in the starting point: a new user starts at
`DEFAULT_ELO = 1200`, which lands them in **Platino — the 4th of 7 leagues**.
Starting halfway up the ladder makes "climbing" meaningless.

This change turns ELO into a **progression ladder that starts at 0 (Hierro) and
climbs with real quest performance**, gated by question difficulty, awarding the
existing league medals as the user crosses thresholds. It reuses the XP flow that
already works and does not touch multiplayer.

> Naming note: starting at 0 and climbing makes this a **skill-progression
> rating**, not a classic mean-reverting ELO. The name "ELO" and the league
> tiers are kept; the semantics are a bottom-to-top ladder, which is the right
> model for a solo study app.

## What Changes

- **Start at 0.** New users start at ELO `0` (Hierro) instead of `1200`. Change
  the `DEFAULT_ELO` constant so every fallback, entity default, seed, and
  leaderboard `COALESCE` follows.
- **ELO moves on quest completion.** Inside the existing `attemptNumber === 1`
  branch of `completeQuest` (next to `addXp`), compute an ELO delta from the
  attempt's **accuracy** vs a virtual opponent whose rating is derived from the
  quest's **average question difficulty**, then persist it with `updateElo`.
- **Difficulty gates the climb.** Map question difficulty to an opponent rating
  spanning the league ladder (easy/medium/hard → low/mid/high rating). Easy
  quests carry you through the low leagues; reaching the top leagues requires
  consistently mastering hard material. Averaged across the quest's questions.
- **Medals come for free.** League medals (`LEAGUE_*`) already re-evaluate on
  `quest.completed`, so once ELO moves they are awarded automatically as the user
  crosses each league threshold. Medals are **permanent** — never revoked if ELO
  later drops.
- **Surface the change.** Return the ELO delta and new ELO in the `completeQuest`
  response for optional UX (the profile league/ELO already reads `stats.elo`, so
  it updates with no frontend change required).

**Non-goals**

- No multiplayer / PvP ELO wiring (future work; `calculateEloDeltas` untouched).
- No new DB column or migration for schema — `stats.elo` already exists.
  (A one-off data migration to reset existing users to 0 is a separate,
  open decision — see Impact.)
- No change to XP, level, coins, or streak computation.

## Impact

- Affected specs: `elo-rating` (new capability spec).
- Affected code:
  - `backend/src/common/leagues.ts` — change `DEFAULT_ELO` to `0`; add a pure
    `calculateSoloEloDelta(currentElo, accuracy, questRating)` helper and a
    difficulty→rating map. Keep `calculateEloDeltas` (multiplayer) untouched.
  - `backend/src/modules/quests/quests.service.ts` — call `updateElo` inside the
    existing `attemptNumber === 1` branch of `completeQuest`; derive the quest
    rating from question difficulties; include the delta in the response.
  - `backend/src/modules/users/user.entity.ts`, `database/seeds/seed.ts`,
    `gateways/matchmaking/*`, and the `users.service.ts` fallbacks — verify they
    inherit the new `DEFAULT_ELO` correctly.
  - (optional) `frontend` — show the ELO delta after finishing a quest.
- **Existing users (decided): reset all to 0.** A one-off data migration sets
  every user's `stats.elo` to `0` so the ladder starts even for everyone at
  Hierro. Existing league medals earned under the old 1200 start are left as-is
  (achievements are permanent); new medals are earned by climbing for real.
- Behavioral change: ELO now rises and falls with performance and gates on
  difficulty; leagues and their medals become reachable from the bottom up. This
  is intended.
