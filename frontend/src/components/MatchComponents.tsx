import type { Party, PartyMember } from '../services/partyService'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSlotsRemaining(party: Party): number {
  return (party.maxMembers ?? 4) - (party.members?.length ?? 0)
}

export function getActiveQuest(party: Party) {
  return party.quests?.find((q) => q.status === 'active') ?? party.quests?.[0] ?? null
}

function getInitial(str?: string | null): string {
  return str?.trim()[0]?.toUpperCase() ?? '?'
}

// ─── MemberAvatar ─────────────────────────────────────────────────────────────

interface MemberAvatarProps {
  member: PartyMember
  size?: number
}

export function MemberAvatar({ member, size = 28 }: MemberAvatarProps) {
  const initial = getInitial(member.user?.displayName)
  if (member.user?.avatarUrl) {
    return (
      <img
        src={member.user.avatarUrl}
        alt={member.user.displayName}
        className="mc-avatar-img"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="mc-avatar-placeholder"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}

// ─── AvatarStack ──────────────────────────────────────────────────────────────

interface AvatarStackProps {
  members: PartyMember[]
  max?: number
}

export function AvatarStack({ members, max = 3 }: AvatarStackProps) {
  const visible = members.slice(0, max)
  const extra = Math.max(0, members.length - max)
  return (
    <div className="mc-avatar-stack">
      {visible.map((m, i) => (
        <div key={m.id} className="mc-avatar-ring" style={{ zIndex: max - i }}>
          <MemberAvatar member={m} size={26} />
        </div>
      ))}
      {extra > 0 && (
        <div className="mc-avatar-ring mc-avatar-extra" style={{ zIndex: 0 }}>
          +{extra}
        </div>
      )}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mc-progress-track">
      <div
        className="mc-progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

// ─── PartyCard ────────────────────────────────────────────────────────────────

const COVER_PALETTES = [
  'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
  'linear-gradient(135deg,#1a0533,#3b0f6b,#1a0533)',
  'linear-gradient(135deg,#0d1b2a,#1b3a4b,#0d1b2a)',
  'linear-gradient(135deg,#1c1c2e,#2d2d44,#1a1a2e)',
  'linear-gradient(135deg,#0f3460,#16213e,#0f3460)',
]

export function PartyCard({ party }: { party: Party }) {
  const quest = getActiveQuest(party)
  const members = party.members ?? []
  const host = members[0]
  const slotsLeft = getSlotsRemaining(party)
  const coverIdx = party.id ? party.id.charCodeAt(0) % COVER_PALETTES.length : 0

  return (
    <div className="mc-card">
      {/* Cover */}
      <div className="mc-card-cover" style={{ background: COVER_PALETTES[coverIdx] }}>
        <div className="mc-cover-orb mc-cover-orb-1" />
        <div className="mc-cover-orb mc-cover-orb-2" />
        <div className="mc-cover-chip">
          <span className="mc-cover-chip-dot" />
          {party.subject?.code ?? party.subject?.name ?? 'SQUAD'}
        </div>
        <div className="mc-card-cover-fade" />
      </div>

      {/* Body */}
      <div className="mc-card-body">
        {/* Host */}
        <div className="mc-host-row">
          <div className="mc-host-avatar-wrap">
            {host ? (
              <MemberAvatar member={host} size={48} />
            ) : (
              <div className="mc-avatar-placeholder" style={{ width: 48, height: 48, fontSize: 20 }}>?</div>
            )}
            <div className="mc-host-online-dot" />
          </div>
          <div className="mc-host-info">
            <span className="mc-host-name">{host?.user?.username ?? 'Sin líder'}</span>
            <span className="mc-host-subject">{party.subject?.name ?? 'Materia'}</span>
          </div>
          <div className="mc-host-lvl">
            LV {host?.user?.stats?.level ?? 0}
          </div>
        </div>

        <div className="mc-divider" />

        {/* Quest */}
        <div className="mc-quest-block">
          <p className="mc-quest-title">
            {quest?.title ?? party.subject?.name ?? 'Party de estudio'}
          </p>
          {party.subject?.name && (
            <p className="mc-quest-sub">{party.subject.name}</p>
          )}
        </div>

        {/* Progress */}
        <div className="mc-progress-section">
          <div className="mc-progress-labels">
            <span className="mc-progress-label">QUEST PROGRESS</span>
            <span className="mc-progress-pct">
              {quest ? '60% COMPLETE' : 'SIN QUEST'}
            </span>
          </div>
          <ProgressBar pct={quest ? 60 : 0} />
        </div>

        {/* Footer */}
        <div className="mc-card-footer">
          <AvatarStack members={members} />
          <span className="mc-slots-label">
            {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} remaining
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── ActionButtons ────────────────────────────────────────────────────────────

interface ActionButtonsProps {
  onDiscard: () => void
  onJoin: () => void
  disabled: boolean
}

export function ActionButtons({ onDiscard, onJoin, disabled }: ActionButtonsProps) {
  return (
    <div className={`mc-actions ${disabled ? '' : 'mc-actions-active'}`}>
      <button
        id="mc-btn-discard"
        className="mc-action-btn mc-btn-discard"
        onClick={onDiscard}
        disabled={disabled}
        aria-label="Descartar"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <button
        id="mc-btn-undo"
        className="mc-action-btn mc-btn-undo"
        disabled
        aria-label="Deshacer"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-4" />
        </svg>
      </button>

      <button
        id="mc-btn-join"
        className="mc-action-btn mc-btn-join"
        onClick={onJoin}
        disabled={disabled}
        aria-label="Unirse"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </button>
    </div>
  )
}

// ─── LoadingState ─────────────────────────────────────────────────────────────

export function LoadingState() {
  return (
    <div className="mc-state-screen">
      <div className="mc-state-spinner" />
      <p className="mc-state-text">Buscando parties para vos...</p>
    </div>
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string | null
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="mc-state-screen">
      <span className="mc-state-icon">⚠️</span>
      <p className="mc-state-title">Algo salió mal</p>
      <p className="mc-state-text">{message ?? 'Error desconocido'}</p>
      <button className="btn btn-primary btn-md" onClick={onRetry}>Reintentar</button>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ onCreateParty }: { onCreateParty: () => void }) {
  return (
    <div className="mc-state-screen">
      <div className="mc-state-emoji">✨</div>
      <p className="mc-state-title">¡Ya recorriste todo!</p>
      <p className="mc-state-text">No hay más squads disponibles en tus materias.</p>
      <button className="btn btn-primary btn-md" onClick={onCreateParty}>
        ⚡ Crear mi party
      </button>
    </div>
  )
}

// ─── CreatePartyBar ───────────────────────────────────────────────────────────

export function CreatePartyBar({ onPress }: { onPress: () => void }) {
  return (
    <div className="mc-footer-bar">
      <div className="mc-footer-inner">
        <div className="mc-footer-plus">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span className="mc-footer-text">¿No encontrás tu match?</span>
        <button className="mc-footer-cta" onClick={onPress}>CREAR PARTY</button>
      </div>
    </div>
  )
}
