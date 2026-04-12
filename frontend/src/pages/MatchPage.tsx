import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatch } from '../hooks/useMatch'
import { usePartyStore } from '../store/partyStore'
import { BottomNav } from '../components/Layouts'
import type { Party } from '../services/partyService'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSlotLabel(party: Party) {
  const taken = party.members?.length ?? 0
  const max = party.maxMembers ?? 4
  const free = max - taken
  return `${free} slot${free !== 1 ? 's' : ''} remaining`
}

function getActiveQuest(party: Party) {
  return party.quests?.find((q) => q.status === 'active') ?? party.quests?.[0] ?? null
}

// ─── PartyCardStub (placeholder hasta Issue 3) ────────────────────────────────
function PartyCardStub({ party }: { party: Party }) {
  const quest = getActiveQuest(party)
  const members = party.members ?? []
  const visibleMembers = members.slice(0, 3)
  const extra = Math.max(0, members.length - 3)

  return (
    <div className="slide-card">
      {/* Cover */}
      <div className="slide-card-cover">
        <div className="slide-card-cover-gradient" />
        <div className="slide-card-subject-badge">{party.subject?.code ?? '?'}</div>
      </div>

      {/* Body */}
      <div className="slide-card-body">
        {/* Host row */}
        <div className="slide-card-host">
          <div className="slide-card-host-avatar">
            {(members[0]?.user?.displayName?.[0] ?? '?')}
          </div>
          <div className="slide-card-host-info">
            <span className="slide-card-host-name">
              {members[0]?.user?.username ?? 'Sin líder'}
            </span>
            <span className="slide-card-host-id">
              {party.subject?.name ?? 'Materia desconocida'}
            </span>
          </div>
          <div className="slide-card-host-lvl">
            LV {members[0]?.user?.stats?.level ?? 0}
          </div>
        </div>

        {/* Quest info */}
        <div className="slide-card-quest">
          <p className="slide-card-quest-title">
            {quest?.title ?? party.subject?.name ?? 'Party de estudio'}
          </p>
          <p className="slide-card-quest-sub">{party.subject?.name}</p>
        </div>

        {/* Progress */}
        <div className="slide-card-progress-row">
          <span className="slide-card-progress-label">QUEST PROGRESS</span>
          <span className="slide-card-progress-pct">
            {quest?.status === 'active' ? 'EN CURSO' : 'SIN QUEST'}
          </span>
        </div>
        <div className="slide-card-progress-track">
          <div className="slide-card-progress-fill" style={{ width: quest ? '60%' : '0%' }} />
        </div>

        {/* Members footer */}
        <div className="slide-card-footer">
          <div className="slide-card-avatars">
            {visibleMembers.map((m, i) => (
              <div key={m.id} className="slide-card-avatar-sm" style={{ zIndex: 10 - i }}>
                {m.user?.displayName?.[0] ?? '?'}
              </div>
            ))}
            {extra > 0 && (
              <div className="slide-card-avatar-sm slide-card-avatar-extra">+{extra}</div>
            )}
          </div>
          <span className="slide-card-slots">{getSlotLabel(party)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MatchPage() {
  const navigate = useNavigate()
  const { setActiveParty } = usePartyStore()
  const { top, status, error, load, discard, join } = useMatch()
  const joinRef = useRef<() => void>(() => {})
  const discardRef = useRef<() => void>(() => {})

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (top) {
      joinRef.current = () => handleJoin(top.id)
      discardRef.current = () => handleDiscard(top.id)
    }
  })

  const handleJoin = async (partyId: string) => {
    try {
      const party = await join(partyId)
      setActiveParty(party)
      navigate(`/party/${party.id}`)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No se pudo unir a la party')
    }
  }

  const handleDiscard = (partyId: string) => { discard(partyId) }

  const showActions = status === 'ready' && !!top

  return (
    <div className="slide-page">

      {/* Header */}
      <header className="slide-header">
        <h1 className="slide-header-title">Party Discovery</h1>
        <button className="slide-filter-btn" aria-label="Filtros">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
        </button>
      </header>

      {/* Deck */}
      <main className="slide-deck">
        {status === 'loading' && (
          <div className="slide-state">
            <div className="slide-spinner" />
            <p className="slide-state-text">Buscando parties para vos...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="slide-state">
            <span className="slide-state-icon">⚠️</span>
            <p className="slide-state-text">{error}</p>
            <button className="btn btn-primary btn-md" onClick={load}>Reintentar</button>
          </div>
        )}
        {status === 'empty' && (
          <div className="slide-state">
            <span className="slide-state-icon">✨</span>
            <h2 className="slide-state-title">¡Ya recorriste todo!</h2>
            <p className="slide-state-text">No hay más squads disponibles en tus materias.</p>
            <button className="btn btn-primary btn-md" onClick={() => navigate('/matchmaking')}>
              ⚡ Crear mi party
            </button>
          </div>
        )}
        {status === 'ready' && top && <PartyCardStub party={top} />}
      </main>

      {/* Action Buttons */}
      <div className={`slide-actions${showActions ? ' slide-actions-visible' : ''}`}>
        <button
          id="slide-btn-discard"
          className="slide-action-btn slide-action-discard"
          onClick={() => top && handleDiscard(top.id)}
          aria-label="Descartar party"
          disabled={!showActions}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <button
          id="slide-btn-undo"
          className="slide-action-btn slide-action-undo"
          aria-label="Deshacer"
          disabled
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-4" />
          </svg>
        </button>
        <button
          id="slide-btn-join"
          className="slide-action-btn slide-action-join"
          onClick={() => top && handleJoin(top.id)}
          aria-label="Unirse a party"
          disabled={!showActions}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </button>
      </div>

      {/* Footer */}
      <footer className="slide-footer">
        <div className="slide-footer-inner">
          <span className="slide-footer-plus">＋</span>
          <span className="slide-footer-text">¿No encontrás tu match?</span>
          <button className="slide-footer-cta" onClick={() => navigate('/matchmaking')}>
            CREAR PARTY
          </button>
        </div>
      </footer>
      {/* Bottom Nav */}
      <BottomNav />
    </div>
  )
}
