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

// ─── PartyCard (Issue 3) ──────────────────────────────────────────────────────

// Seed determinístico → imagen de cover única por party
function getCoverImageUrl(partyId: string): string {
  const seed = partyId
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)
  // Picsum da fotos reales con seed; 640×360 formato landscape
  return `https://picsum.photos/seed/${seed}/640/360`
}

// Ícono emoji según nombre de materia
function getSubjectIcon(name?: string | null): string {
  if (!name) return '📚'
  const n = name.toLowerCase()
  if (n.includes('matemát') || n.includes('cálculo') || n.includes('álgebra')) return '📐'
  if (n.includes('física'))   return '⚛️'
  if (n.includes('química'))  return '🧪'
  if (n.includes('program') || n.includes('soft') || n.includes('datos')) return '💻'
  if (n.includes('inglés') || n.includes('lengua') || n.includes('escrit')) return '📝'
  if (n.includes('historia') || n.includes('sociol')) return '🏛️'
  if (n.includes('bio'))      return '🧬'
  if (n.includes('económ') || n.includes('contab') || n.includes('admin')) return '📊'
  if (n.includes('derecho'))  return '⚖️'
  return '📚'
}

export function PartyCard({ party }: { party: Party }) {
  const quest      = getActiveQuest(party)
  const members    = party.members ?? []
  const host       = members.find((m) => m.role === 'leader') ?? members[0]
  const slotsLeft  = getSlotsRemaining(party)
  const coverUrl   = getCoverImageUrl(party.id)
  const subjectIcon = getSubjectIcon(party.subject?.name)

  // Progreso heurístico: rondas completadas / totales (placeholder hasta backend real)
  const progressPct = quest ? Math.min(95, Math.max(10,
    (party.members?.length ?? 1) * 15
  )) : 0

  return (
    <div className="mc-card">

      {/* ── Cover con imagen real ──────────────────────────────── */}
      <div className="mc-card-cover">
        <img
          className="mc-cover-img"
          src={coverUrl}
          alt={party.subject?.name ?? 'Party cover'}
          loading="lazy"
        />
        {/* Overlay de degradado para legibilidad */}
        <div className="mc-cover-overlay" />

        {/* Chip de materia con ícono */}
        <div className="mc-cover-chip">
          <span className="mc-cover-chip-dot" />
          <span className="mc-cover-chip-icon">{subjectIcon}</span>
          {party.subject?.code ?? party.subject?.name ?? 'SQUAD'}
        </div>

        {/* Badge de slots */}
        <div className="mc-cover-slots-badge">
          {slotsLeft > 0 ? `${slotsLeft} libre${slotsLeft !== 1 ? 's' : ''}` : 'COMPLETO'}
        </div>

        {/* Fade al body */}
        <div className="mc-card-cover-fade" />
      </div>

      {/* ── Body con glassmorphism ────────────────────────────── */}
      <div className="mc-card-body">

        {/* Host row */}
        <div className="mc-host-row">
          <div className="mc-host-avatar-wrap">
            {host ? (
              <MemberAvatar member={host} size={50} />
            ) : (
              <div className="mc-avatar-placeholder" style={{ width: 50, height: 50, fontSize: 20 }}>?</div>
            )}
            <div className="mc-host-online-dot" />
          </div>
          <div className="mc-host-info">
            <div className="mc-host-name-row">
              <span className="mc-host-name">{host?.user?.username ?? 'Sin líder'}</span>
              {host?.role === 'leader' && (
                <span className="mc-leader-badge">👑 Líder</span>
              )}
            </div>
            <span className="mc-host-subject">{party.subject?.name ?? 'Materia'}</span>
          </div>
          <div className="mc-host-lvl">LV {host?.user?.stats?.level ?? 0}</div>
        </div>

        <div className="mc-divider" />

        {/* Quest block */}
        <div className="mc-quest-block">
          <p className="mc-quest-title">
            {quest?.title ?? party.subject?.name ?? 'Party de estudio'}
          </p>
          {quest && (
            <p className="mc-quest-sub">
              {party.subject?.name}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="mc-progress-section">
          <div className="mc-progress-labels">
            <span className="mc-progress-label">QUEST PROGRESS</span>
            <span className="mc-progress-pct">
              {quest ? `${progressPct}% COMPLETE` : 'SIN QUEST ACTIVA'}
            </span>
          </div>
          <ProgressBar pct={progressPct} />
        </div>

        {/* Footer */}
        <div className="mc-card-footer">
          <AvatarStack members={members} />
          <span className="mc-slots-label">
            {members.length}/{party.maxMembers ?? 4} miembros
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
