import type { Party, PartyMember } from '../../services/partyService'
import { AvatarWithBorder } from '../AvatarWithBorder'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSlotsRemaining(party: Party): number {
  return (party.maxMembers ?? 4) - (party.members?.length ?? 0)
}

export function getActiveQuest(party: Party) {
  return party.quests?.find((q) => q.status === 'active') ?? party.quests?.[0] ?? null
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
    <div className="inline-flex origin-center" style={{ transform: `scale(${scale})` }}>
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
    <div className="flex items-center">
      {visible.map((m, i) => (
        <div key={m.id} className="rounded-full border-2 border-surface -ml-[7px] overflow-hidden relative shrink-0 first:ml-0" style={{ zIndex: max - i }}>
          <MemberAvatar member={m} size={26} />
        </div>
      ))}
      {extra > 0 && (
        <div className="rounded-full border-2 border-surface -ml-[7px] overflow-hidden relative shrink-0 bg-input text-muted text-[10px] font-bold w-[30px] h-[30px] flex items-center justify-center first:ml-0 z-0">
          +{extra}
        </div>
      )}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-[5px] bg-input rounded-full overflow-hidden w-full">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-[width] duration-800 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

// ─── PartyCard (Issue 3) ──────────────────────────────────────────────────────

function getCoverImageUrl(subjectName?: string | null, partyId?: string): string {
  const n = (subjectName ?? '').toLowerCase()
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
  
  const seed = (partyId ?? 'study').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return `https://picsum.photos/seed/${seed}/400/600`
}

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

  const progressPct = quest ? Math.min(95, Math.max(10,
    (party.members?.length ?? 1) * 15
  )) : 0

  return (
    <div className="w-full h-full rounded-[24px] bg-surface border border-[var(--overlay-border)] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.04)] select-none flex flex-col group">
      
      {/* ── Cover con imagen real ──────────────────────────────── */}
      <div className="flex-1 min-h-[180px] relative overflow-hidden">
        <img
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-400 ease-out group-hover:scale-104"
          src={coverUrl}
          alt={party.subject?.name ?? 'Party cover'}
          loading="lazy"
        />
        {/* Overlay de degradado para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/45 to-base/95" />

        {/* Chip de materia con ícono */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-black/45 backdrop-blur-md border border-[var(--overlay-border)] rounded-full px-3 py-1.25 text-[11px] font-bold text-primary uppercase tracking-[0.6px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981] animate-pulse shrink-0" />
          <span className="text-[13px]">{subjectIcon}</span>
          {party.subject?.code ?? party.subject?.name ?? 'SQUAD'}
        </div>

        {/* Badge de slots */}
        <div className="absolute bottom-[52px] left-3.5 bg-black/55 backdrop-blur-md border border-[var(--overlay-border)] rounded-full px-2.5 py-1 text-[11px] font-semibold text-secondary">
          {slotsLeft > 0 ? `${slotsLeft} libre${slotsLeft !== 1 ? 's' : ''}` : 'COMPLETO'}
        </div>

        {/* Fade al body */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-surface" />
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-2.5 shrink-0">
        {/* Host row */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 z-10">
            {host ? (
              <MemberAvatar member={host} size={46} />
            ) : (
              <div className="rounded-full bg-gradient-to-br from-accent-light to-[#2563eb] flex items-center justify-center font-extrabold text-primary w-[46px] h-[46px] text-[18px]">?</div>
            )}
            <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[#10b981] rounded-full border-2 border-surface shadow-[0_0_6px_#10b981]" />
          </div>

          <div className="flex-1 flex flex-col gap-0.5 min-w-0 text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[15px] text-primary truncate max-w-[130px]">{host?.user?.username ?? 'Sin líder'}</span>
              {host?.role === 'leader' && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.75 py-0.25 whitespace-nowrap">👑 Líder</span>
              )}
            </div>
            <span className="text-[12px] text-emerald-400 font-medium truncate">{party.subject?.name ?? 'Materia'}</span>
          </div>
          <div className="bg-emerald-500/15 border border-emerald-500/35 rounded-full px-2.5 py-0.75 text-[11px] font-bold text-emerald-400 shrink-0 whitespace-nowrap">LV {host?.user?.stats?.level ?? 0}</div>
        </div>

        <div className="h-[1px] bg-[var(--overlay-soft)] my-0" />

        {/* Quest / descripción */}
        <div className="flex flex-col gap-0.5 text-left">
          <p className="text-[17px] font-bold text-primary leading-snug truncate">
            {quest?.title ?? party.subject?.name ?? 'Party de estudio'}
          </p>
          {quest && (
            <p className="text-[13px] text-muted truncate">{party.subject?.name}</p>
          )}
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-faint tracking-[0.8px] uppercase">QUEST PROGRESS</span>
            <span className="text-[10px] font-bold text-blue-400 tracking-[0.4px]">
              {quest ? `${progressPct}% COMPLETE` : 'SIN QUEST ACTIVA'}
            </span>
          </div>
          <ProgressBar pct={progressPct} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-1">
          <AvatarStack members={members} />
          <span className="text-[12px] text-faint font-medium">
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
    <div className={`flex justify-center items-center gap-5 px-5 py-4 shrink-0 transition-opacity duration-300 ease-out ${disabled ? 'opacity-30 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
      <button
        id="mc-btn-discard"
        className="rounded-full flex items-center justify-center border-2 transition-all duration-200 shrink-0 not-disabled:active:scale-88 disabled:opacity-35 disabled:cursor-not-allowed w-[58px] h-[58px] border-red-500/50 bg-red-500/8 text-red-500 hover:not-disabled:bg-red-500/18 hover:not-disabled:scale-110 hover:not-disabled:shadow-[0_0_22px_rgba(239,68,68,0.3)]"
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
        className="rounded-full flex items-center justify-center border-2 transition-all duration-200 shrink-0 w-[48px] h-[48px] border-[var(--overlay-border)] bg-surface text-faint opacity-35 cursor-not-allowed"
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
        className="rounded-full flex items-center justify-center border-2 transition-all duration-200 shrink-0 not-disabled:active:scale-88 disabled:opacity-35 disabled:cursor-not-allowed w-[68px] h-[68px] border-emerald-500/55 bg-emerald-500/8 text-emerald-400 hover:not-disabled:bg-emerald-500/18 hover:not-disabled:scale-110 hover:not-disabled:shadow-[0_0_26px_rgba(16,185,129,0.35)]"
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
    <div className="flex flex-col items-center gap-3.5 text-center px-4 py-6">
      <div className="w-11 h-11 rounded-full border-3 border-[var(--overlay-border)] border-t-purple-500 animate-spin" />
      <p className="text-muted text-sm max-w-[260px] leading-relaxed">Buscando parties para vos...</p>
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
    <div className="flex flex-col items-center gap-3.5 text-center px-4 py-6">
      <span className="text-[52px] leading-none">⚠️</span>
      <p className="text-[20px] font-extrabold text-primary">Algo salió mal</p>
      <p className="text-muted text-sm max-w-[260px] leading-relaxed">{message ?? 'Error desconocido'}</p>
      <button className="mt-2 px-5 py-2.5 rounded-lg bg-accent text-primary font-bold text-sm hover:bg-accent-light transition-colors min-h-[44px]" onClick={onRetry}>Reintentar</button>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ onCreateParty }: { onCreateParty: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3.5 text-center px-4 py-6">
      <div className="text-[56px] leading-none">✨</div>
      <p className="text-[20px] font-extrabold text-primary">¡Ya recorriste todo!</p>
      <p className="text-muted text-sm max-w-[260px] leading-relaxed">No hay más squads disponibles en tus materias.</p>
      <button className="mt-2 px-5 py-2.5 rounded-lg bg-accent text-primary font-bold text-sm hover:bg-accent-light transition-colors min-h-[44px]" onClick={onCreateParty}>
        ⚡ Crear mi party
      </button>
    </div>
  )
}

// ─── CreatePartyBar ───────────────────────────────────────────────────────────

export function CreatePartyBar({ onPress }: { onPress: () => void }) {
  return (
    <div className="px-4 pb-[22px] shrink-0">
      <div className="flex items-center gap-2.5 bg-surface border border-[var(--overlay-border)] rounded-2xl py-[13px] px-4">
        <div className="w-[26px] h-[26px] rounded-full bg-input border border-[var(--overlay-border)] flex items-center justify-center text-faint shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span className="flex-1 text-[13px] text-muted text-left">¿No encontrás tu match?</span>
        <button className="text-[12px] font-extrabold text-blue-400 tracking-[0.4px] hover:text-blue-300 transition-colors whitespace-nowrap bg-transparent border-0 cursor-pointer" onClick={onPress}>CREAR PARTY</button>
      </div>
    </div>
  )
}
