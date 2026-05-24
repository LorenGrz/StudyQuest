import type { Party, PartyMember } from '../services/partyService'
import { AvatarWithBorder } from './AvatarWithBorder'

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
  const bs = size > 40 ? 'md' : 'sm'
  const baseSize = bs === 'md' ? 44 : 36
  const scale = size / baseSize

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center', display: 'inline-flex' }}>
      <AvatarWithBorder
        displayName={member.user?.displayName ?? '?'}
        avatarUrl={member.user?.avatarUrl}
        borderImageUrl={member.user?.activeCosmetics?.borderImageUrl}
        size={bs}
      />
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

// Mapa de keywords por tipo de materia → Unsplash portrait temático
function getCoverImageUrl(subjectName?: string | null, partyId?: string): string {
  const n = (subjectName ?? '').toLowerCase()
  // Fotos portrait (400×600) temáticas por materia desde Unsplash
  if (n.includes('matemát') || n.includes('cálculo') || n.includes('álgebra'))
    return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=600&fit=crop&q=80'
  if (n.includes('algoritmo') || n.includes('estructura') || n.includes('datos') && n.includes('base'))
    return 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=600&fit=crop&q=80'
  if (n.includes('datos') || n.includes('base'))
    return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=600&fit=crop&q=80'
  if (n.includes('redes') || n.includes('computador') || n.includes('network'))
    return 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=400&h=600&fit=crop&q=80'
  if (n.includes('sistem') || n.includes('operat'))
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=600&fit=crop&q=80'
  if (n.includes('física'))  return 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=600&fit=crop&q=80'
  if (n.includes('química')) return 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=600&fit=crop&q=80'
  if (n.includes('biolog'))  return 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&h=600&fit=crop&q=80'
  if (n.includes('program') || n.includes('softw'))
    return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=600&fit=crop&q=80'
  if (n.includes('económ') || n.includes('admin'))
    return 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=600&fit=crop&q=80'
  if (n.includes('derecho')) return 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=600&fit=crop&q=80'
  if (n.includes('inglés') || n.includes('lengua'))
    return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=600&fit=crop&q=80'
  // Fallback con seed basado en partyId para que sea consistente
  const seed = (partyId ?? 'study').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return `https://picsum.photos/seed/${seed}/400/600`
}

// Ícono emoji según nombre de materia
function getSubjectIcon(name?: string | null): string {
  if (!name) return '📚'
  const n = name.toLowerCase()
  if (n.includes('matemát') || n.includes('cálculo') || n.includes('álgebra')) return '📐'
  if (n.includes('física'))   return '⚛️'
  if (n.includes('química'))  return '🧪'
  if (n.includes('program') || n.includes('softw')) return '💻'
  if (n.includes('datos') || n.includes('base') || n.includes('algoritmo')) return '🗄️'
  if (n.includes('redes') || n.includes('computador') || n.includes('network')) return '🌐'
  if (n.includes('sistem') || n.includes('operat')) return '⚙️'
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
  const coverUrl   = getCoverImageUrl(party.subject?.name, party.id)
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

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="mc-card-body">

        {/* Host row */}
        <div className="mc-host-row">
          <div className="mc-host-avatar-wrap">
            {host ? (
              <MemberAvatar member={host} size={46} />
            ) : (
              <div className="mc-avatar-placeholder" style={{ width: 46, height: 46, fontSize: 18 }}>?</div>
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

        {/* Quest / descripción */}
        <div className="mc-quest-block">
          <p className="mc-quest-title">
            {quest?.title ?? party.subject?.name ?? 'Party de estudio'}
          </p>
          {quest && (
            <p className="mc-quest-sub">{party.subject?.name}</p>
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
