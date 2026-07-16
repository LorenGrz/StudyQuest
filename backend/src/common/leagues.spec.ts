import {
  calculateSoloEloDelta,
  questRatingFromDifficulties,
  DIFFICULTY_RATINGS,
  ELO_K_FACTOR,
  expectedScore,
} from './leagues';

describe('questRatingFromDifficulties', () => {
  it('returns medium rating for an empty array', () => {
    expect(questRatingFromDifficulties([])).toBe(DIFFICULTY_RATINGS.medium);
  });

  it('returns the single difficulty rating when there is one question', () => {
    expect(questRatingFromDifficulties(['easy'])).toBe(DIFFICULTY_RATINGS.easy);
    expect(questRatingFromDifficulties(['hard'])).toBe(DIFFICULTY_RATINGS.hard);
  });

  it('averages mixed difficulties', () => {
    // easy(400) + hard(2000) = 2400 / 2 = 1200
    expect(questRatingFromDifficulties(['easy', 'hard'])).toBe(1200);
    // easy(400) + medium(1200) + hard(2000) = 3600 / 3 = 1200
    expect(questRatingFromDifficulties(['easy', 'medium', 'hard'])).toBe(1200);
  });

  it('rounds the average', () => {
    // easy(400) + easy(400) + hard(2000) = 2800 / 3 ≈ 933.33 → 933
    expect(questRatingFromDifficulties(['easy', 'easy', 'hard'])).toBe(933);
  });
});

describe('calculateSoloEloDelta', () => {
  it('returns a positive delta when accuracy exceeds the expected score', () => {
    // Player at elo 0 vs a medium quest (1200): expected ≈ 0.048
    // With accuracy = 1.0, delta should be large positive
    const delta = calculateSoloEloDelta(0, 1.0, DIFFICULTY_RATINGS.medium);
    expect(delta).toBeGreaterThan(0);
  });

  it('returns a negative delta when accuracy is below the expected score', () => {
    // Player at elo 2400 vs an easy quest (400): expected ≈ 0.976
    // With accuracy = 0.0, delta should be large negative
    const delta = calculateSoloEloDelta(2400, 0.0, DIFFICULTY_RATINGS.easy);
    expect(delta).toBeLessThan(0);
  });

  it('returns ~0 delta when accuracy matches the expected score', () => {
    // When accuracy === expected, delta should be 0 (or round to 0)
    const questRating = DIFFICULTY_RATINGS.medium;
    const currentElo = questRating; // symmetric: expected = 0.5
    const delta = calculateSoloEloDelta(currentElo, 0.5, questRating);
    expect(delta).toBe(0);
  });

  it('is symmetric: equal elo with accuracy 1 mirrors accuracy 0', () => {
    const questRating = 800;
    const elo = 800; // expected = 0.5
    const deltaHigh = calculateSoloEloDelta(elo, 1.0, questRating);
    const deltaLow = calculateSoloEloDelta(elo, 0.0, questRating);
    // k * (1 - 0.5) = +16, k * (0 - 0.5) = -16
    expect(deltaHigh).toBe(Math.round(ELO_K_FACTOR * 0.5));
    expect(deltaLow).toBe(-Math.round(ELO_K_FACTOR * 0.5));
    expect(deltaHigh + deltaLow).toBe(0);
  });

  it('uses the expectedScore formula internally', () => {
    const currentElo = 1000;
    const questRating = 1400;
    const accuracy = 0.6;
    const expected = expectedScore(currentElo, questRating);
    const expectedDelta = Math.round(ELO_K_FACTOR * (accuracy - expected));
    expect(calculateSoloEloDelta(currentElo, accuracy, questRating)).toBe(
      expectedDelta,
    );
  });
});
