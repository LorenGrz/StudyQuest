import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { MobileLayout } from '../components/Layouts'
import { Spinner, Select } from '../components/UI'
import { useAuthStore } from '../store/authStore'
import { userService } from '../services/userService'
import type { LeaderboardEntry, MyLeaderboardPosition } from '../services/userService'
import { universityService } from '../services/universityService'
import type { Career } from '../services/universityService'
import { useLeaderboard, leaderboardFilter, type LeaderboardScope } from '../hooks/useLeaderboard'

import { getLeague, DEFAULT_ELO } from '../utils/leagues'
import { AvatarWithBorder } from '../components/AvatarWithBorder'

type TabType = 'global' | 'university' | 'career'

const TAB_LABELS: Record<TabType, string> = {
  global: 'Global',
  university: 'Por universidad',
  career: 'Por carrera',
}

export default function LeaderboardPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('global')
  const [selectedCareerId, setSelectedCareerId] = useState<string>('')
  const [careers, setCareers] = useState<Career[]>([])
  const [selectedUniversity, setSelectedUniversity] = useState<string>(user?.university ?? '')
  const [universities, setUniversities] = useState<string[]>([])
  const [myPosition, setMyPosition] = useState<MyLeaderboardPosition | null>(null)

  // Default the career selector to the user's own career once it's known.
  useEffect(() => {
    if (!selectedCareerId && user?.careerId) {
      setSelectedCareerId(user.careerId)
    }
  }, [user, selectedCareerId])

  useEffect(() => {
    if (!user?.universityId) return
    let cancelled = false
    universityService
      .getCareers(user.universityId)
      .then((data) => { if (!cancelled) setCareers(data) })
      .catch(() => { /* the selector still works with just the user's own career */ })
    return () => { cancelled = true }
  }, [user?.universityId])

  // Default the university selector to the user's own university once it's known.
  useEffect(() => {
    if (!selectedUniversity && user?.university) {
      setSelectedUniversity(user.university)
    }
  }, [user, selectedUniversity])

  useEffect(() => {
    let cancelled = false
    userService
      .getLeaderboardUniversities()
      .then((data) => { if (!cancelled) setUniversities(data) })
      .catch(() => { /* the selector still works with just the user's own university */ })
    return () => { cancelled = true }
  }, [])

  // The user's own university may not yet appear in the aggregate list (e.g.
  // nobody else from it has played yet) — keep it selectable regardless.
  const universityOptions = useMemo(
    () =>
      selectedUniversity && !universities.includes(selectedUniversity)
        ? [selectedUniversity, ...universities]
        : universities,
    [selectedUniversity, universities],
  )

  // The user's own career may be `retired` and so absent from the active
  // catalog list — keep it selectable regardless, labeled with the legacy name.
  const careerOptions = useMemo(() => {
    const options = careers.map((c) => ({ value: c.id, label: c.name }))
    if (selectedCareerId && !careers.some((c) => c.id === selectedCareerId)) {
      return [{ value: selectedCareerId, label: user?.career ?? selectedCareerId }, ...options]
    }
    return options
  }, [careers, selectedCareerId, user?.career])

  const scope: LeaderboardScope | null = useMemo(() => {
    if (activeTab === 'global') return { type: 'global' }
    if (activeTab === 'university') {
      return selectedUniversity ? { type: 'university', university: selectedUniversity } : null
    }
    return selectedCareerId ? { type: 'career', careerId: selectedCareerId } : null
  }, [activeTab, selectedUniversity, selectedCareerId])

  const { data: entries, loading: isLoading, error } = useLeaderboard(scope)

  // Fetch the caller's own rank only when they're not already in the visible top.
  useEffect(() => {
    if (!scope || isLoading) return
    if (entries.some((e) => e.userId === user?.id)) {
      setMyPosition(null)
      return
    }
    let cancelled = false
    userService
      .getMyLeaderboardPosition(leaderboardFilter(scope))
      .then((pos) => { if (!cancelled) setMyPosition(pos) })
      .catch(() => { if (!cancelled) setMyPosition(null) })
    return () => { cancelled = true }
  }, [scope, entries, isLoading, user?.id])

  const showCareerEmptyState = activeTab === 'career' && !user?.careerId
  const showContent = !showCareerEmptyState

  return (
    <MobileLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="px-4 pt-5 pb-2">
          <h1 className="text-2xl font-extrabold pt-5 pb-2">🏆 Leaderboard</h1>
          <p className="text-[13px] text-muted mt-0.5">Ranking global, por universidad y por carrera</p>
        </div>

        {/* Main tabs */}
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`py-[7px] px-4 rounded-full border border-[var(--overlay-border)] bg-surface text-secondary text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer hover:border-accent hover:text-accent-light min-h-[44px] ${activeTab === tab ? 'bg-accent border-accent text-on-accent shadow-[0_0_12px_rgba(124,58,237,0.4)]' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {activeTab === 'university' && (
          <div className="px-4 pb-3 max-w-xs">
            <Select
              id="leaderboard-university"
              label="Universidad"
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              options={universityOptions.map((u) => ({ value: u, label: u }))}
            />
          </div>
        )}

        {showCareerEmptyState && (
          <div className="text-center py-10 px-5">
            <p className="text-sm font-semibold text-primary">Elegí tu carrera en el perfil para ver este ranking.</p>
          </div>
        )}

        {activeTab === 'career' && !showCareerEmptyState && (
          <div className="px-4 pb-3 max-w-xs">
            <Select
              id="leaderboard-career"
              label="Carrera"
              value={selectedCareerId}
              onChange={(e) => setSelectedCareerId(e.target.value)}
              options={careerOptions}
            />
          </div>
        )}

        {/* Content */}
        {showContent && (
          <>
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

            {!isLoading && !error && myPosition && (
              <div className="px-4 pb-8 text-center">
                <p className="text-sm font-semibold text-secondary">
                  Tu posición: #{myPosition.rank}
                </p>
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
