import { Difficulty } from '../modules/quests/quiz-question.entity';

export interface League {
  tier: number;
  name: string;
  minElo: number;
  maxElo: number;
  icon: string;
  color: string;
}

export const LEAGUES: League[] = [
  { tier: 1, name: 'Hierro',      minElo: 0,    maxElo: 399,      icon: '⛏️',  color: '#a8a29e' },
  { tier: 2, name: 'Plata',       minElo: 400,  maxElo: 799,      icon: '🥈',  color: '#cbd5e1' },
  { tier: 3, name: 'Oro',         minElo: 800,  maxElo: 1199,     icon: '🥇',  color: '#fbbf24' },
  { tier: 4, name: 'Platino',     minElo: 1200, maxElo: 1599,     icon: '💠',  color: '#67e8f9' },
  { tier: 5, name: 'Esmeralda',   minElo: 1600, maxElo: 1999,     icon: '💚',  color: '#34d399' },
  { tier: 6, name: 'Diamante',    minElo: 2000, maxElo: 2399,     icon: '💎',  color: '#818cf8' },
  { tier: 7, name: 'QuestMaster', minElo: 2400, maxElo: Infinity, icon: '👑',  color: '#f59e0b' },
];

export const DEFAULT_ELO = 0;
export const ELO_K_FACTOR = 32;

export const DIFFICULTY_RATINGS: Record<Difficulty, number> = {
  easy: 400,
  medium: 1200,
  hard: 2000,
};

export function questRatingFromDifficulties(difficulties: Difficulty[]): number {
  if (!difficulties.length) return DIFFICULTY_RATINGS.medium;
  const sum = difficulties.reduce((a, d) => a + DIFFICULTY_RATINGS[d], 0);
  return Math.round(sum / difficulties.length);
}

export function calculateSoloEloDelta(
  currentElo: number,
  accuracy: number,
  questRating: number,
): number {
  const expected = expectedScore(currentElo, questRating);
  return Math.round(ELO_K_FACTOR * (accuracy - expected));
}

export function getLeague(elo: number): League {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (elo >= LEAGUES[i].minElo) return LEAGUES[i];
  }
  return LEAGUES[0];
}

/**
 * Expected score for player A vs player B (standard Elo formula).
 */
export function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Calculate Elo deltas after a multiplayer match.
 * players: array of { userId, elo, score } where score = quiz points earned.
 * Returns map of userId -> eloDelta (can be negative).
 */
export function calculateEloDeltas(
  players: { userId: string; elo: number; score: number }[],
): Map<string, number> {
  const deltas = new Map<string, number>();

  for (const player of players) {
    let delta = 0;
    const opponents = players.filter((p) => p.userId !== player.userId);

    for (const opponent of opponents) {
      const expected = expectedScore(player.elo, opponent.elo);
      const actual =
        player.score === opponent.score
          ? 0.5
          : player.score > opponent.score
            ? 1
            : 0;
      delta += ELO_K_FACTOR * (actual - expected);
    }

    // Divide by opponent count to avoid over-inflating ELO in large groups
    delta = Math.round(delta / Math.max(opponents.length, 1));
    deltas.set(player.userId, delta);
  }

  return deltas;
}
