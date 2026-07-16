# Tasks: ELO progression ladder from quest performance

## 1. ELO math + constants (`backend/src/common/leagues.ts`)
- [ ] 1.1 Change `DEFAULT_ELO` from `1200` to `0`.
- [ ] 1.2 Add `DIFFICULTY_RATINGS` map (`easy: 400`, `medium: 1200`, `hard: 2000`)
      and `questRatingFromDifficulties(difficulties)` helper (defaults to `medium`
      when empty). Import the `Difficulty` type.
- [ ] 1.3 Add pure `calculateSoloEloDelta(currentElo, accuracy, questRating)`
      returning `round(ELO_K_FACTOR * (accuracy - expectedScore(currentElo, questRating)))`.
- [ ] 1.4 Leave `calculateEloDeltas` (multiplayer) untouched.

## 2. Audit `DEFAULT_ELO` fan-out
- [ ] 2.1 Grep every `DEFAULT_ELO` and hardcoded `1200` in `backend/src`
      (`user.entity.ts` default, `seed.ts`, `matchmaking/*`, `users.service.ts`
      fallbacks and leaderboard `COALESCE`).
- [ ] 2.2 Ensure each imports/uses the constant (no stray `1200`) so the new
      start value is consistent everywhere.

## 3. Wire ELO into quest completion (`backend/src/modules/quests/quests.service.ts`)
- [ ] 3.1 In `completeQuest`, ensure the loaded quest's questions include
      `difficulty` (adjust the fetch/select if needed).
- [ ] 3.2 Inside the existing `attemptNumber === 1` branch, after `addXp`:
      compute `questRating = questRatingFromDifficulties(quest.questions.map(q => q.difficulty))`,
      then `delta = calculateSoloEloDelta(currentElo, accuracy, questRating)`,
      then `await usersService.updateElo(userId, delta)`.
- [ ] 3.3 Read `currentElo` via `usersService.getElo(userId)` before the update
      to compute `eloAfter`.
- [ ] 3.4 Ensure `updateElo` runs **before** the `quest.completed` event is
      emitted (so achievements re-evaluate with the new ELO).
- [ ] 3.5 Add `eloDelta` and `eloAfter` to the `completeQuest` return payload.

## 4. Data migration — reset existing users
- [ ] 4.1 Add a migration that sets `stats.elo = 0` for all users
      (`UPDATE users SET stats = jsonb_set(stats, '{elo}', '0'::jsonb)`).
- [ ] 4.2 Do NOT touch existing achievements/medals.

## 5. Frontend (optional UX)
- [ ] 5.1 Consume `eloDelta` / `eloAfter` in the quest-completion screen to show
      the ELO change and any league-up.
- [ ] 5.2 Confirm profile league/ELO (`ProfileHeader`, leaderboards) reflect the
      updated `stats.elo` — should require no change since they read `stats.elo`.

## 6. Tests
- [ ] 6.1 Unit-test `calculateSoloEloDelta`: high accuracy → positive delta, low
      accuracy → negative, clamp behavior via `updateElo`.
- [ ] 6.2 Unit-test `questRatingFromDifficulties`: mixed difficulties average,
      empty defaults to medium.
- [ ] 6.3 Integration-test `completeQuest`: first attempt changes ELO and returns
      `eloDelta`/`eloAfter`; repeat attempt does not change ELO.
- [ ] 6.4 Verify a league-crossing completion grants the matching `LEAGUE_*`
      achievement.

## 7. Verification
- [ ] 7.1 New user starts at `0` (Hierro); complete an easy quest and confirm ELO
      rises and league updates on the profile.
- [ ] 7.2 Confirm existing seeded users are at `0` after migration.
- [ ] 7.3 Run backend test suite green.
