import { Flame } from 'lucide-react'

interface ProfileStatsGridProps {
  elo: number
  winRate: number
  stats: {
    quizzesPlayed: number
    currentStreak: number
  }
  leagueColor: string
}

export function ProfileStatsGrid({ elo, winRate, stats, leagueColor }: ProfileStatsGridProps) {
  return (
    <section>
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pb-2">
        Estadísticas
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div
          className="bg-surface border-2 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-black/20"
          style={{ borderColor: leagueColor }}
        >
          <span className="text-2xl font-extrabold drop-shadow-md" style={{ color: leagueColor }}>
            {elo}
          </span>
          <span className="text-xs text-muted mt-1">ELO</span>
        </div>
        <div className="bg-surface border border-[var(--overlay-border)] rounded-lg p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-accent-light">{winRate}%</span>
          <span className="text-xs text-muted mt-1">Win Rate</span>
        </div>
        <div className="bg-surface border border-[var(--overlay-border)] rounded-lg p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-accent-light">{stats.quizzesPlayed}</span>
          <span className="text-xs text-muted mt-1">Quests</span>
        </div>
        <div className="bg-surface border border-[var(--overlay-border)] rounded-lg p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-accent-light flex items-center gap-1">
            <Flame size={20} className="text-orange-400" aria-hidden="true" />
            {stats.currentStreak}
          </span>
          <span className="text-xs text-muted mt-1">Racha</span>
        </div>
      </div>
    </section>
  )
}
