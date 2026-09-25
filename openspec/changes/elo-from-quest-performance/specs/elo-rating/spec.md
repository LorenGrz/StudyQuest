# Spec delta: elo-rating

## ADDED Requirements

### Requirement: ELO ladder starts at zero
New users SHALL start with an ELO of `0`, placing them in the lowest league
(Hierro). The `DEFAULT_ELO` constant SHALL be `0` and SHALL be the single source
of truth for entity defaults, seeds, matchmaking, and service fallbacks.

#### Scenario: New user default ELO
- **WHEN** a new user account is created
- **THEN** their `stats.elo` is `0`
- **AND** `getLeague(0)` returns the Hierro league

#### Scenario: Existing users reset on migration
- **WHEN** the ELO-reset data migration runs
- **THEN** every existing user's `stats.elo` is set to `0`
- **AND** previously earned league achievements are retained

### Requirement: ELO changes on quest completion
When a user completes a quest on their first attempt, the system SHALL adjust the
user's ELO based on the attempt accuracy measured against the quest's difficulty
rating, using the standard expected-score formula, and SHALL clamp the result to
`>= 0`.

#### Scenario: High accuracy raises ELO
- **WHEN** a user completes a first attempt with accuracy above the expected
  score for the quest's rating
- **THEN** `stats.elo` increases by `round(ELO_K_FACTOR * (accuracy - expected))`
- **AND** the increase is clamped so ELO never drops below `0`

#### Scenario: Low accuracy lowers ELO
- **WHEN** a user completes a first attempt with accuracy below the expected
  score for the quest's rating
- **THEN** `stats.elo` decreases by the same formula, clamped at `0`

#### Scenario: Non-first attempts do not change ELO
- **WHEN** a user completes a quest on a repeat attempt (`attemptNumber > 1`)
- **THEN** `stats.elo` is unchanged

### Requirement: Difficulty gates the climb
The quest's virtual-opponent rating SHALL be derived from the average difficulty
of its questions, so that easy content plateaus in the lower leagues and the top
leagues require mastering harder content.

#### Scenario: Difficulty maps to opponent rating
- **WHEN** the quest rating is computed
- **THEN** each question's difficulty maps to its configured rating
  (`easy` < `medium` < `hard`)
- **AND** the quest rating is the average of its questions' ratings
- **AND** a quest with no difficulty data defaults to the `medium` rating

### Requirement: League medals awarded on threshold crossings
Crossing into a higher league SHALL award the corresponding league medal. The ELO
update SHALL be applied before the `quest.completed` achievement evaluation so the
new ELO is visible. Medals SHALL be permanent and SHALL NOT be revoked if ELO
later drops below the threshold.

#### Scenario: Reaching a new league awards its medal
- **WHEN** an ELO increase moves the user across a league's `minElo`
- **AND** the `quest.completed` achievement evaluation runs afterward
- **THEN** the corresponding `LEAGUE_*` achievement is granted

#### Scenario: Dropping a league keeps the medal
- **WHEN** the user's ELO later falls below a league threshold they had crossed
- **THEN** the previously granted league medal remains

### Requirement: Quest completion reports the ELO change
The `completeQuest` response SHALL include the ELO delta and the resulting ELO so
clients can surface the change; profile league/ELO views SHALL reflect the updated
`stats.elo` with no additional client change required.

#### Scenario: Completion response includes ELO delta
- **WHEN** a first-attempt quest completion changes the user's ELO
- **THEN** the response includes `eloDelta` and `eloAfter`
