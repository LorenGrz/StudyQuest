import { useState, useEffect } from 'react'
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
      <div className="leaderboard-header">
        <h1 className="page-title">🏆 Leaderboard</h1>
        <p className="leaderboard-subtitle">Ranking global por materia</p>
      </div>

      {/* Subject Selector */}
      {subjects.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <p className="empty-text">Inscribite a materias para ver el leaderboard.</p>
        </div>
      ) : (
        <>
          <div className="leaderboard-subject-tabs">
            {subjects.map(s => (
              <button
                key={s.id}
                id={`lb-tab-${s.id}`}
                className={`leaderboard-tab ${selectedSubjectId === s.id ? 'leaderboard-tab--active' : ''}`}
                onClick={() => setSelectedSubjectId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoading && (
            <div className="center-spinner" style={{ marginTop: '40px' }}>
              <Spinner size="lg" />
            </div>
          )}

          {error && !isLoading && (
            <div className="alert alert-danger" style={{ marginTop: '16px' }}>{error}</div>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p className="empty-text">Nadie en el ranking todavía. ¡Sé el primero!</p>
            </div>
          )}

          {!isLoading && !error && entries.length > 0 && (
            <div className="leaderboard-list">
              {/* Top 3 podium */}
              {entries.length >= 3 && (
                <div className="leaderboard-podium">
                  {/* 2nd */}
                  <PodiumCard entry={entries[1]} currentUserId={user?.id} position={2} />
                  {/* 1st */}
                  <PodiumCard entry={entries[0]} currentUserId={user?.id} position={1} />
                  {/* 3rd */}
                  <PodiumCard entry={entries[2]} currentUserId={user?.id} position={3} />
                </div>
              )}

              {/* Rest of the list */}
              {entries.slice(entries.length >= 3 ? 3 : 0).map((entry, idx) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  isMe={entry.userId === user?.id}
                  animDelay={idx * 40}
                />
              ))}
            </div>
          )}
        </>
      )}
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
  const heights = { 1: '90px', 2: '70px', 3: '60px' }

  return (
    <div
      className={`podium-card podium-card--${position} ${isMe ? 'podium-card--me' : ''}`}
      style={{ borderColor: league.color, boxShadow: `0 0 16px ${league.glowColor}` }}
    >
      <div className="podium-medal">{medals[position]}</div>
      <AvatarWithBorder
        displayName={entry.displayName ?? '?'}
        avatarUrl={entry.avatarUrl}
        borderImageUrl={entry.activeCosmetics?.borderImageUrl}
        size={position === 1 ? 'lg' : 'md'}
        glowColor={league.glowColor}
      />
      <p className="podium-name">{entry.displayName}</p>
      <p className="podium-league" style={{ color: league.color }}>{league.icon} {league.name}</p>
      <p className="podium-elo">{entry.elo} ELO</p>
      <div className="podium-bar" style={{ height: heights[position], background: league.gradient }} />
    </div>
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
    <div
      className={`leaderboard-row ${isMe ? 'leaderboard-row--me' : ''}`}
      style={{
        animationDelay: `${animDelay}ms`,
        borderLeft: isMe ? `4px solid ${league.color}` : '4px solid transparent',
      }}
    >
      <span className="leaderboard-rank">{entry.rank}</span>
      <AvatarWithBorder
        displayName={entry.displayName ?? '?'}
        avatarUrl={entry.avatarUrl}
        borderImageUrl={entry.activeCosmetics?.borderImageUrl}
        size="sm"
        glowColor={isMe ? league.glowColor : undefined}
      />
      <div className="leaderboard-info">
        <span className="leaderboard-name">
          {entry.displayName}
          {isMe && <span className="leaderboard-you-badge"> • Tú</span>}
        </span>
        <span className="leaderboard-username">@{entry.username}</span>
      </div>
      <div className="leaderboard-right">
        <span className="leaderboard-league-icon" title={league.name}>{league.icon}</span>
        <span className="leaderboard-elo" style={{ color: league.color }}>{entry.elo}</span>
      </div>
    </div>
  )
}
