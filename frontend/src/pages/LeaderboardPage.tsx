import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MobileLayout } from '../components/Layouts'
import { Spinner } from '../components/UI'
import { useAuthStore } from '../store/authStore'
import { userService } from '../services/userService'
import type { LeaderboardEntry } from '../services/userService'

import { getLeague, DEFAULT_ELO } from '../utils/leagues'
import { AvatarWithBorder } from '../components/AvatarWithBorder'

export default function LeaderboardPage() {
  const { user } = useAuthStore()
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjects = user?.enrolledSubjects ?? []

  // Select first subject by default
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id)
    }
  }, [subjects, selectedSubjectId])

  useEffect(() => {
    if (!selectedSubjectId) return
    setIsLoading(true)
    setError(null)
    userService
      .getLeaderboard(selectedSubjectId)
      .then(setEntries)
      .catch(() => setError('No se pudo cargar el leaderboard'))
      .finally(() => setIsLoading(false))
  }, [selectedSubjectId])

  return (
    <MobileLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="px-4 pt-5 pb-2">
          <h1 className="text-2xl font-extrabold pt-5 pb-2">🏆 Leaderboard</h1>
          <p className="text-[13px] text-muted mt-0.5">Ranking global por materia</p>
        </div>

      {/* Subject Selector */}
      {subjects.length === 0 ? (
        <div className="text-center py-10 px-5">
          <p className="text-sm font-semibold text-primary">Inscribite a materias para ver el leaderboard.</p>
        </div>
      ) : (
        <>
          {/* Subject tabs: scroll on mobile, wrap on desktop */}
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {subjects.map(s => (
              <button
                key={s.id}
                id={`lb-tab-${s.id}`}
                className={`py-[7px] px-4 rounded-full border border-[var(--overlay-border)] bg-surface text-secondary text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer hover:border-accent hover:text-accent-light min-h-[44px] ${selectedSubjectId === s.id ? 'bg-accent border-accent text-on-accent shadow-[0_0_12px_rgba(124,58,237,0.4)]' : ''}`}
                onClick={() => setSelectedSubjectId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoading && (
            <div className="flex justify-center items-center min-h-[200px] mt-10">
              <Spinner size="lg" />
            </div>
          )}

          {error && !isLoading && (
            <div className="mx-4 mt-4 px-4 py-3 rounded-lg text-sm bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.2)]">{error}</div>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <div className="text-center py-10 px-5">
              <p className="text-sm font-semibold text-primary">Nadie en el ranking todavía. ¡Sé el primero!</p>
            </div>
          )}

          {!isLoading && !error && entries.length > 0 && (
            /*
              Desktop: podium + ranked list side by side (2-col)
              Mobile: podium stacked above ranked list
            */
            <div className="px-4 pb-8">
              {/* Podium */}
              {entries.length >= 3 && (
                <div className="flex justify-center items-end gap-2 py-5 pb-6">
                  {/* Mobile/tablet: classic 2nd-1st-3rd arc */}
                  <div className="flex justify-center items-end gap-2 w-full">
                    <PodiumCard entry={entries[1]} currentUserId={user?.id} position={2} />
                    <PodiumCard entry={entries[0]} currentUserId={user?.id} position={1} />
                    <PodiumCard entry={entries[2]} currentUserId={user?.id} position={3} />
                  </div>
                  {/* Desktop: stacked 1st-2nd-3rd */}
                  <div className="hidden">
                    <PodiumCard entry={entries[0]} currentUserId={user?.id} position={1} />
                    <PodiumCard entry={entries[1]} currentUserId={user?.id} position={2} />
                    <PodiumCard entry={entries[2]} currentUserId={user?.id} position={3} />
                  </div>
                </div>
              )}

              {/* Ranked list */}
              <div className="flex flex-col gap-2 mt-2">
                {entries.slice(entries.length >= 3 ? 3 : 0).map((entry, idx) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    isMe={entry.userId === user?.id}
                    animDelay={idx * 40}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </motion.div>
    </MobileLayout>
  )
}

function PodiumCard({
  entry,
  currentUserId,
  position,
}: {
  entry: LeaderboardEntry
  currentUserId?: string
  position: 1 | 2 | 3
}) {
  const league = getLeague(entry.elo ?? DEFAULT_ELO)
  const isMe = entry.userId === currentUserId
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const mobileHeights = { 1: '90px', 2: '70px', 3: '60px' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-surface pt-3 px-2.5 pb-0 transition-transform duration-200 overflow-hidden flex-1 max-w-[120px] hover:-translate-y-0.5 ${isMe ? 'animate-pulse-border' : ''}`}
      style={{ borderColor: league.color, boxShadow: `0 0 16px ${league.glowColor}` }}
    >
      <div className="text-[22px] shrink-0">{medals[position]}</div>
      <div className="shrink-0">
        <AvatarWithBorder
          displayName={entry.displayName ?? '?'}
          avatarUrl={entry.avatarUrl}
          borderImageUrl={entry.activeCosmetics?.borderImageUrl}
          size={position === 1 ? 'lg' : 'md'}
          glowColor={league.glowColor}
        />
      </div>
      <div className="flex flex-col items-center flex-1 min-w-0">
        <p className="text-xs font-bold text-center text-primary overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px] w-full">{entry.displayName}</p>
        <p className="text-[11px] font-semibold" style={{ color: league.color }}>{league.icon} {league.name}</p>
        <span className="text-xs text-muted font-semibold">{entry.elo} ELO</span>
      </div>
      {/* Mobile podium height bar */}
      <div className="w-full mt-2 rounded-b-lg opacity-60" style={{ height: mobileHeights[position], background: league.gradient }} />
    </motion.div>
  )
}

function LeaderboardRow({
  entry,
  isMe,
  animDelay,
}: {
  entry: LeaderboardEntry
  isMe: boolean
  animDelay: number
}) {
  const league = getLeague(entry.elo ?? DEFAULT_ELO)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animDelay / 1000, duration: 0.2, ease: 'easeOut' }}
      className={`flex items-center gap-3 bg-surface border rounded-lg px-3.5 py-3 transition-[border-color] duration-200 hover:translate-x-1 ${isMe ? 'bg-[rgba(124,58,237,0.06)]' : 'border-[var(--overlay-border)]'}`}
      style={{
        borderLeft: isMe ? `4px solid ${league.color}` : '4px solid transparent',
      }}
    >
      <span className="text-base font-extrabold text-muted w-7 text-center shrink-0">{entry.rank}</span>
      <AvatarWithBorder
        displayName={entry.displayName ?? '?'}
        avatarUrl={entry.avatarUrl}
        borderImageUrl={entry.activeCosmetics?.borderImageUrl}
        size="sm"
        glowColor={isMe ? league.glowColor : undefined}
      />
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-bold text-primary overflow-hidden text-ellipsis whitespace-nowrap">
          {entry.displayName}
          {isMe && <span className="text-[11px] font-bold text-accent-light"> • Tú</span>}
        </span>
        <span className="text-xs text-muted truncate">@{entry.username}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-lg" title={league.name}>{league.icon}</span>
        <span className="text-sm font-extrabold text-primary">{entry.elo}</span>
      </div>
    </motion.div>
  )
}
