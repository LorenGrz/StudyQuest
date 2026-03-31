import { useNavigate } from 'react-router-dom'
import type { User } from '../services/userService'
import type { Party } from '../services/partyService'
import type { Subject } from '../services/userService'
import { Button, SectionTitle } from './UI'

// ─── GreetingHeader ──────────────────────────────────────────────────────────
export function GreetingHeader({ user }: { user: User | null }) {
  if (!user) return null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="greeting-header">
      <div className="greeting-avatar">
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt={user.displayName} className="avatar" />
          : <div className="avatar-placeholder">{user.displayName[0].toUpperCase()}</div>
        }
      </div>
      <div className="greeting-text">
        <p className="greeting-salute">{greeting},</p>
        <h1 className="greeting-name">{user.displayName} <span className="wave">👋</span></h1>
      </div>
      <div className="xp-chip">
        <span className="xp-icon">⚡</span>
        <span className="xp-value">{user.stats?.xp ?? 0} XP</span>
      </div>
    </div>
  )
}

// ─── ActivePartyBanner ───────────────────────────────────────────────────────
export function ActivePartyBanner({ party }: { party: Party | null }) {
  const navigate = useNavigate()
  if (!party) return null

  return (
    <div className="party-banner" onClick={() => navigate(`/party/${party.id}`)}>
      <div className="party-banner-info">
        <span className="party-banner-dot" />
        <div>
          <p className="party-banner-label">Party Activa</p>
          <p className="party-banner-name">{party.name}</p>
        </div>
      </div>
      <Button size="sm" variant="primary">Ir →</Button>
    </div>
  )
}

// ─── SubjectCard ─────────────────────────────────────────────────────────────
function SubjectCard({ subject }: { subject: Subject }) {
  const navigate = useNavigate()
  const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2']
  const color = colors[subject.name.charCodeAt(0) % colors.length]

  return (
    <div
      className="subject-card"
      style={{ '--subject-color': color } as React.CSSProperties}
      onClick={() => navigate(`/subjects`)}
    >
      <div className="subject-card-icon" style={{ background: color }}>
        📚
      </div>
      <div className="subject-card-info">
        <p className="subject-card-name">{subject.name}</p>
        <p className="subject-card-meta">Sem. {subject.semester}</p>
      </div>
      <div className="subject-card-arrow">›</div>
    </div>
  )
}

export function SubjectCardGrid({ subjects }: { subjects: Subject[] }) {
  if (subjects.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-icon">📖</p>
        <p className="empty-text">No tenés materias inscriptas</p>
        <p className="empty-sub">Explorá el catálogo y anotate</p>
      </div>
    )
  }

  return (
    <div className="subject-grid">
      {subjects.map((s) => <SubjectCard key={s.id} subject={s} />)}
    </div>
  )
}

// ─── QuickActions ─────────────────────────────────────────────────────────────
export function QuickActions() {
  const navigate = useNavigate()
  return (
    <div className="quick-actions">
      <button className="quick-btn quick-btn-match" onClick={() => navigate('/matchmaking')}>
        <span className="quick-btn-icon">🎮</span>
        <span>Find Party</span>
      </button>
      <button className="quick-btn quick-btn-explore" onClick={() => navigate('/subjects')}>
        <span className="quick-btn-icon">🔍</span>
        <span>Explorar</span>
      </button>
    </div>
  )
}
