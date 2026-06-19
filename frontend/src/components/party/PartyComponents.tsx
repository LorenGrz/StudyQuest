import { useState, useEffect, useRef } from 'react'
import { Sparkles, FileText, X, Paperclip } from 'lucide-react'
import type { Party, PartyMember, Activity } from '../../services/partyService'
import { partyService } from '../../services/partyService'
import { friendService } from '../../services/friendService'
import type { User } from '../../services/userService'
import type { Quest } from '../../services/questService'
import { Button, Spinner } from '../UI'
import { AvatarWithBorder } from '../AvatarWithBorder'
import { useNavigate } from 'react-router-dom'
import { SegmentedTabs } from '../PagePrimitives'
import { TournamentCreationModal as TournamentCreationModalBase } from './TournamentCreationModal'
import { tournamentService } from '../../services/tournamentService'
export { ChatBox } from '../party-chat/ChatBox'

// Re-export SegmentedTabs as TabBar so callers don't need to change imports
export { SegmentedTabs as TabBar }

const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`
  return `${API_ORIGIN}/${url}`
}

// ─── PartyHeader ─────────────────────────────────────────────────────────────
export function PartyHeader({ party }: { party: Party | null }) {
  if (!party) return null
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold text-primary truncate">
          {party.name ?? party.subject?.name ?? 'Party'}
        </h1>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
            party.status === 'active'
              ? 'bg-success/10 border-success/30 text-success'
              : party.status === 'waiting' || party.status === 'forming'
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-surface border-edge text-secondary'
          }`}>
            {party.status === 'active' ? 'Activa' : party.status === 'waiting' ? 'Esperando' : party.status === 'forming' ? 'Armando' : 'Finalizada'}
          </span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface border border-edge text-secondary">
            {party.isPrivate ? '🔒 Privada' : '🌎 Pública'}
          </span>
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold text-secondary">
        👥 {party.members?.length ?? 0}
      </span>
    </div>
  )
}

// ─── MemberList ──────────────────────────────────────────────────────────────
interface MemberListProps {
  members: PartyMember[]
  partyId: string
  isPrivate: boolean
  currentUserId: string
  onVisibilityChange: (isPrivate: boolean) => void
  onLeave: () => void
  onRemoveMember: (targetUserId: string) => void
  onCloseParty: () => void
}

export function MemberList({ members, partyId, isPrivate, currentUserId, onVisibilityChange, onLeave, onRemoveMember, onCloseParty }: MemberListProps) {
  const [showInvite, setShowInvite] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const isLeader = members.some((m) => m.userId === currentUserId && m.role === 'leader')

  return (
    <>
      <div className="flex flex-col gap-2 p-4 overflow-y-auto">
        <button
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-accent/10 border border-accent/30 text-accent-light font-semibold text-sm hover:bg-accent/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setShowInvite(true)}
        >
          <span aria-hidden="true">🔗</span>
          <span>Invitar miembros</span>
        </button>

        {isLeader && (
          <label className="flex items-center gap-3 cursor-pointer bg-surface p-3 rounded-lg border border-edge">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={() => onVisibilityChange(!isPrivate)}
              className="w-[18px] h-[18px] cursor-pointer accent-[var(--accent)]"
            />
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-primary">Party Privada 🔒</span>
              <span className="text-xs text-secondary">Ocultar la party en Matchmaking.</span>
            </div>
          </label>
        )}

        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const avatarUrl = resolveAssetUrl(m.user.avatarUrl)
            const isLeaderRow = m.role === 'leader'
            const title = m.user.activeCosmetics?.titleText

            return (
              <div
                key={m.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${
                  isLeaderRow ? 'bg-accent/5 border-accent/40' : 'bg-surface border-edge'
                }`}
              >
                <div className="relative shrink-0">
                  <AvatarWithBorder
                    displayName={m.user.displayName}
                    avatarUrl={avatarUrl}
                    borderImageUrl={m.user.activeCosmetics?.borderImageUrl}
                    size="sm"
                  />
                  <span
                    className={`absolute bottom-2 right-2 w-3 h-3 rounded-full border-2 border-surface ${
                      m.isOnline ? 'bg-success' : 'bg-muted'
                    }`}
                    title={m.isOnline ? 'En línea' : 'Desconectado'}
                  />
                </div>

                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                  <span className="font-bold text-primary text-sm tracking-wide truncate">
                    {m.user.displayName}
                  </span>
                  {isLeaderRow && (
                    <span className="shrink-0 text-amber-400 text-sm" title="Líder" aria-label="Líder">👑</span>
                  )}
                  {title && (
                    <span className="shrink-0 max-w-[88px] truncate text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/30 rounded px-1.5 py-0.5">
                      {title}
                    </span>
                  )}
                </div>

                <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 border border-warning/30 rounded-full px-2 py-0.5 tabular-nums">
                  ⚡ {m.user.stats?.xp ?? 0}
                </span>

                {isLeader && m.userId !== currentUserId && (
                  <button
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                    title="Remover miembro"
                    aria-label={`Remover a ${m.user.displayName}`}
                    onClick={() => onRemoveMember(m.userId)}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* ─ Acciones del miembro ─ */}
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-edge">
          <button
            className="w-full px-4 py-3 rounded-lg bg-surface border border-edge text-secondary font-semibold text-sm hover:border-danger hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            onClick={onLeave}
          >
            🚪 Salir de la party
          </button>

          {isLeader && (
            confirmClose ? (
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-danger/5 border border-danger/30">
                <p className="text-[13px] text-secondary m-0">
                  ¿Cerrás la party para todos?
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 rounded-lg bg-danger text-primary font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger" onClick={onCloseParty}>
                    Sí, cerrar
                  </button>
                  <button className="flex-1 px-3 py-2 rounded-lg bg-surface border border-edge text-secondary font-semibold text-sm hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setConfirmClose(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="w-full px-4 py-3 rounded-lg bg-surface border border-edge text-secondary font-semibold text-sm hover:border-danger hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                onClick={() => setConfirmClose(true)}
              >
                🔒 Cerrar party
              </button>
            )
          )}
        </div>
      </div>

      {showInvite && (
        <InviteSheet partyId={partyId} onClose={() => setShowInvite(false)} />
      )}
    </>
  )
}

// ─── InviteSheet ──────────────────────────────────────────────────────────────
interface InviteSheetProps {
  partyId: string
  onClose: () => void
}

export function InviteSheet({ partyId, onClose }: InviteSheetProps) {
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [friends, setFriends] = useState<User[]>([])
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFriendsLoading, setIsFriendsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadInviteLink = async () => {
      setIsLoading(true)
      try {
        const { token } = await partyService.generateInvite(partyId)
        if (!active) return
        const base = window.location.origin
        setLink(`${base}/join/${token}`)
      } catch {
        if (active) setError('No se pudo generar el link')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadInviteLink()
    return () => { active = false }
  }, [partyId])

  useEffect(() => {
    let active = true

    const loadFriends = async () => {
      setIsFriendsLoading(true)
      try {
        const result = await friendService.getFriends()
        if (active) setFriends(result)
      } finally {
        if (active) setIsFriendsLoading(false)
      }
    }

    loadFriends()
    return () => { active = false }
  }, [])

  const inviteFriend = async (friendId: string) => {
    setInviteError(null)
    setInviteSuccess(null)
    try {
      await partyService.inviteFriend(partyId, friendId)
      setInviteSuccess('Invitación enviada a tu amigo.')
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setInviteError(message ?? 'No se pudo enviar la invitación')
    }
  }

  const handleCopy = () => {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleShare = () => {
    if (!link || !navigator.share) return
    navigator.share({ title: 'Únete a mi Party en StudyQuest', url: link })
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Sheet — bottom sheet on mobile, centered dialog on sm+ */}
      <div
        className="w-full sm:w-auto sm:min-w-[360px] sm:max-w-sm bg-elevated border border-edge rounded-t-2xl sm:rounded-xl p-6 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle (mobile only) */}
        <div className="sm:hidden mx-auto w-10 h-1.5 rounded-full bg-edge -mt-1 mb-1" />

        <h2 className="text-lg font-bold text-primary text-center">🔗 Invitar a la Party</h2>
        <p className="text-sm text-secondary text-center -mt-2">Compartí este link — expira en 24 horas</p>

        {isLoading && (
          <div className="flex justify-center py-5">
            <Spinner size="md" />
          </div>
        )}

        {error && (
          <p className="text-sm text-danger text-center">{error}</p>
        )}

        {link && !isLoading && (
          <>
            <div className="flex items-center gap-2 bg-surface border border-edge rounded-lg px-3 py-2">
              <span className="flex-1 text-xs text-secondary truncate">{link}</span>
              <button
                className="shrink-0 min-h-9 px-3 rounded-md bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={handleCopy}
                aria-label="Copiar link"
              >
                {copied ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>

            {'share' in navigator && (
              <Button variant="secondary" className="w-full" onClick={handleShare}>
                📤 Compartir
              </Button>
            )}

            <div className="flex flex-col gap-3 pt-2 border-t border-edge">
              <h3 className="text-sm font-semibold text-primary">Invitar a un amigo</h3>
              {isFriendsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="md" />
                </div>
              ) : friends.length ? (
                <div className="flex flex-col gap-2">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between gap-3 bg-surface border border-edge rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <strong className="block text-sm text-primary truncate">{friend.displayName}</strong>
                        <p className="text-xs text-secondary truncate">@{friend.username}</p>
                      </div>
                      <Button size="sm" variant="primary" onClick={() => inviteFriend(friend.id)}>
                        Invitar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary text-center py-2">No tenés amigos para invitar. Agregá amigos para invitarlos directamente.</p>
              )}
              {inviteSuccess && <p className="text-sm text-success text-center">{inviteSuccess}</p>}
              {inviteError && <p className="text-sm text-danger text-center">{inviteError}</p>}
            </div>
          </>
        )}

        <Button variant="ghost" className="w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  )
}

// ─── UploadNoteCard ───────────────────────────────────────────────────────────
interface UploadNoteCardProps {
  onUpload: (title: string, file?: File, textContent?: string) => Promise<unknown>
  isLoading: boolean
}

export function UploadNoteCard({ onUpload, isLoading }: UploadNoteCardProps) {
  const [title, setTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    setSelectedFile(null)
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = selectedFile
    const trimmedText = noteText.trim()

    if (!file && !trimmedText) {
      setError('Pegá al menos 100 caracteres o subí un PDF.')
      return
    }

    if (!file && trimmedText.length < 100) {
      setError(`El texto es muy corto. Faltan ${100 - trimmedText.length} caracteres para generar la quest.`)
      return
    }

    setError(null)

    try {
      await onUpload(title, file ?? undefined, trimmedText || undefined)
      setTitle('')
      setNoteText('')
      setExpanded(false)
      clearFile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la quest.')
    }
  }

  if (!expanded) {
    return (
      <button
        className="w-full flex flex-col items-center gap-1 px-4 py-5 rounded-lg bg-surface border border-edge hover:border-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setExpanded(true)}
      >
        <Sparkles size={28} className="text-accent-light" aria-hidden="true" />
        <span className="font-semibold text-primary">Crear Quest con IA</span>
        <span className="text-xs text-muted">Subí un apunte → quiz automático</span>
      </button>
    )
  }

  return (
    <form className="flex flex-col gap-3 bg-surface border border-edge rounded-lg p-4" onSubmit={submit}>
      <h3 className="text-base font-bold text-primary">Nueva Quest</h3>

      <div className="input-group">
        <label className="input-label" htmlFor="quest-title">Título del quiz</label>
        <input
          id="quest-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Procesos y concurrencia"
          required
        />
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="quest-note">Texto del apunte</label>
        <textarea
          id="quest-note"
          className={`input input-textarea ${error ? 'input-error' : ''}`}
          value={noteText}
          onChange={(e) => {
            setNoteText(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Pegá acá el texto del apunte… (o subí un PDF abajo)"
          rows={4}
        />
        <p className="text-xs text-secondary">
          Si pegás texto, necesitás al menos 100 caracteres. Si subís PDF, el texto es opcional.
        </p>
      </div>

      <div className="input-group">
        <label className="input-label">Archivo PDF (opcional)</label>
        {fileName ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent-bg px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-sm text-primary">
              <FileText size={16} className="shrink-0 text-accent-light" aria-hidden="true" />
              <span className="truncate">{fileName}</span>
            </span>
            <button
              type="button"
              onClick={clearFile}
              className="shrink-0 rounded-md p-1 text-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Quitar archivo"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-edge bg-input px-3 py-2.5 text-sm text-secondary transition-colors hover:border-accent hover:text-primary focus-within:ring-2 focus-within:ring-accent">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setSelectedFile(file)
                setFileName(file?.name ?? null)
              }}
            />
            <Paperclip size={16} aria-hidden="true" />
            Elegí un PDF
          </label>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>Cancelar</Button>
        <Button type="submit" isLoading={isLoading}>Generar Quest ⚡</Button>
      </div>
    </form>
  )
}

function TournamentCreationModalLocal({ quest, onClose }: { quest: Quest; onClose: () => void }) {
  const [title, setTitle] = useState(`Torneo de ${quest.title}`)
  const [delayMin, setDelayMin] = useState(2)
  const [durationMin, setDurationMin] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const startsAt = new Date(Date.now() + delayMin * 60 * 1000).toISOString()
    const endsAt = new Date(Date.now() + (delayMin + durationMin) * 60 * 1000).toISOString()

    try {
      await tournamentService.create({
        title,
        questId: quest.id,
        startsAt,
        endsAt,
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear el torneo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-elevated border border-edge rounded-xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-primary text-center">
          🏆 Crear Torneo por Tiempo
        </h2>
        <p className="text-sm text-secondary text-center -mt-2">
          Múltiples parties competirán resolviendo esta quest en simultáneo.
        </p>

        {success ? (
          <div className="text-center py-6 text-success font-bold">
            ✓ ¡Torneo creado con éxito!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="input-group">
              <label className="label">Título del Torneo</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Torneo de Álgebra..."
                required
              />
            </div>

            <div className="input-group">
              <label className="label">¿Cuándo empieza? (Cuenta regresiva)</label>
              <select
                className="input"
                value={delayMin}
                onChange={(e) => setDelayMin(Number(e.target.value))}
              >
                <option value={1}>En 1 minuto</option>
                <option value={2}>En 2 minutos</option>
                <option value={5}>En 5 minutos</option>
                <option value={10}>En 10 minutos</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label">¿Cuánto dura la competencia?</label>
              <select
                className="input"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              >
                <option value={3}>3 minutos</option>
                <option value={5}>5 minutos</option>
                <option value={10}>10 minutos</option>
                <option value={20}>20 minutos</option>
                <option value={30}>30 minutos</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
                Crear ⚔️
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── QuestCard ───────────────────────────────────────────────────────────────
export function QuestCard({ quest }: { quest: Quest }) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const questionCount = quest.questionCount ?? quest.questions?.length ?? 0
  const sourceLabel = quest.sourceType === 'pdf' || quest.sourcePdfUrl ? 'PDF adjunto' : 'Texto'
  const isGenerating = quest.status === 'generating' || quest.status === 'pending'
  const isFailed = quest.status === 'failed'
  const canPlay = !isGenerating && !isFailed
  const statusLabel = isGenerating
    ? 'Generando con IA...'
    : isFailed
      ? 'Falló la generación'
      : quest.myStatus === 'in_progress'
        ? 'En curso'
        : quest.myBestScore != null
          ? `Mejor puntaje: ${quest.myBestScore}`
          : quest.myStatus === 'completed'
            ? 'Completada'
            : 'Lista para jugar'
  const statusHint = isGenerating
    ? 'Volvé a esta party en unos segundos para empezar.'
    : isFailed
      ? 'Abrila más tarde o generá una nueva quest.'
      : null

  const handleOpenQuest = () => {
    if (!canPlay) return
    navigate(`/quiz/${quest.id}`)
  }

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 bg-surface border border-edge rounded-lg px-4 py-3 transition-colors ${canPlay ? 'cursor-pointer hover:border-accent' : 'opacity-80'}`}
        onClick={handleOpenQuest}
        aria-disabled={!canPlay}
      >
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <p className="font-semibold text-sm text-primary truncate">{quest.title}</p>
          <p className="text-xs text-secondary">
            {questionCount} preguntas{` • ${sourceLabel}`}
          </p>
          {statusLabel && <p className="text-xs text-accent-light">{statusLabel}</p>}
          {statusHint && <p className="text-xs text-secondary">{statusHint}</p>}
          {quest.sourcePdfUrl && (
            <a
              className="text-xs text-accent underline"
              href={new URL(quest.sourcePdfUrl, 'http://localhost:3000').toString()}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              Ver PDF
            </a>
          )}
          {canPlay && (
            <button
              className="self-start mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/15 text-accent-light border border-accent/30 text-xs font-bold hover:bg-accent/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={(e) => {
                e.stopPropagation()
                setShowModal(true)
              }}
            >
              🏆 Iniciar Torneo
            </button>
          )}
        </div>
        <span className={`shrink-0 text-lg ${isGenerating ? 'animate-pulse' : ''}`} aria-hidden="true">
          {isGenerating
            ? '⏳'
            : quest.status === 'active'
              ? '▶'
              : quest.status === 'failed'
                ? '⚠️'
                : '✅'}
        </span>
      </div>

      {showModal && (
        <TournamentCreationModalBase quest={quest} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}

// ─── ActivityFeed ────────────────────────────────────────────────────────────
interface ActivityFeedProps {
  activities: Activity[]
  isLoading?: boolean
}

const getActivityEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    member_joined: '👋',
    member_left: '👋',
    member_removed: '🚫',
    quest_created: '✨',
    quest_started: '▶️',
    quest_completed: '✅',
    party_status_changed: '🔄',
    party_visibility_changed: '🔒',
    member_promoted: '👑',
  }
  return emojis[type] || '📌'
}

const getActivityColor = (type: string): string => {
  const colors: Record<string, string> = {
    member_joined: '#4ade80',
    member_left: '#64748b',
    member_removed: '#ef4444',
    quest_created: '#06b6d4',
    quest_started: '#f59e0b',
    quest_completed: '#10b981',
    party_status_changed: '#8b5cf6',
    party_visibility_changed: '#ec4899',
    member_promoted: '#f59e0b',
  }
  return colors[type] || '#94a3b8'
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-secondary text-sm">
        <p>Sin actividad todavía</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 py-3 border-b border-edge last:border-0">
          <div
            className="shrink-0 mt-1 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: getActivityColor(activity.type) }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm" aria-hidden="true">{getActivityEmoji(activity.type)}</span>
              {activity.user && (
                <span className="text-sm font-semibold text-primary">{activity.user.displayName}</span>
              )}
            </div>
            <p className="text-xs text-secondary mt-0.5">{activity.description}</p>
            <span className="text-[11px] text-muted">
              {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
