export interface League {
  tier: number
  name: string
  minElo: number
  maxElo: number
  icon: string
  color: string
  gradient: string
  glowColor: string
}

export const LEAGUES: League[] = [
  {
    tier: 1,
    name: 'Hierro',
    minElo: 0,
    maxElo: 399,
    icon: '⛏️',
    color: '#a8a29e',
    gradient: 'linear-gradient(135deg, #78716c, #a8a29e)',
    glowColor: 'rgba(168,162,158,0.4)',
  },
  {
    tier: 2,
    name: 'Plata',
    minElo: 400,
    maxElo: 799,
    icon: '🥈',
    color: '#cbd5e1',
    gradient: 'linear-gradient(135deg, #94a3b8, #e2e8f0)',
    glowColor: 'rgba(203,213,225,0.4)',
  },
  {
    tier: 3,
    name: 'Oro',
    minElo: 800,
    maxElo: 1199,
    icon: '🥇',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #d97706, #fde68a)',
    glowColor: 'rgba(251,191,36,0.4)',
  },
  {
    tier: 4,
    name: 'Platino',
    minElo: 1200,
    maxElo: 1599,
    icon: '💠',
    color: '#67e8f9',
    gradient: 'linear-gradient(135deg, #0891b2, #a5f3fc)',
    glowColor: 'rgba(103,232,249,0.4)',
  },
  {
    tier: 5,
    name: 'Esmeralda',
    minElo: 1600,
    maxElo: 1999,
    icon: '💚',
    color: '#34d399',
    gradient: 'linear-gradient(135deg, #059669, #6ee7b7)',
    glowColor: 'rgba(52,211,153,0.4)',
  },
  {
    tier: 6,
    name: 'Diamante',
    minElo: 2000,
    maxElo: 2399,
    icon: '💎',
    color: '#818cf8',
    gradient: 'linear-gradient(135deg, #4f46e5, #c7d2fe)',
    glowColor: 'rgba(129,140,248,0.4)',
  },
  {
    tier: 7,
    name: 'QuestMaster',
    minElo: 2400,
    maxElo: Infinity,
    icon: '👑',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #b45309, #fde68a, #f59e0b)',
    glowColor: 'rgba(245,158,11,0.6)',
  },
]

export const DEFAULT_ELO = 1200

export function getLeague(elo: number): League {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (elo >= LEAGUES[i].minElo) return LEAGUES[i]
  }
  return LEAGUES[0]
}

export interface EloProgress {
  percent: number
  currentInLeague: number
  leagueRange: number
  nextLeague: League | null
}

export function getEloProgress(elo: number): EloProgress {
  const league = getLeague(elo)
  const isMax = league.maxElo === Infinity
  if (isMax) {
    return { percent: 100, currentInLeague: elo - league.minElo, leagueRange: elo - league.minElo, nextLeague: null }
  }
  const leagueRange = league.maxElo - league.minElo + 1
  const currentInLeague = elo - league.minElo
  const percent = Math.min(100, Math.floor((currentInLeague / leagueRange) * 100))
  const nextIndex = LEAGUES.findIndex(l => l.tier === league.tier + 1)
  const nextLeague = nextIndex >= 0 ? LEAGUES[nextIndex] : null
  return { percent, currentInLeague, leagueRange, nextLeague }
}
