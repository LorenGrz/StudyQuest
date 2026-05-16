import { useRef, useState, useEffect } from 'react'
import type { Party, ChatMessage, PartyMember } from '../services/partyService'
import { partyService } from '../services/partyService'
import { friendService } from '../services/friendService'
import type { User } from '../services/userService'
import type { Quest } from '../services/questService'
import { Button, Spinner } from './UI'
import { useNavigate } from 'react-router-dom'

// ─── PartyHeader ─────────────────────────────────────────────────────────────
export function PartyHeader({ party }: { party: Party | null }) {
  if (!party) return null
  return (
    <div className="party-header">
      <div className="party-header-info">
        <h1 className="party-header-name">{party.name ?? party.subject?.name ?? 'Party'}</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`party-status party-status-${party.status}`}>
            {party.status === 'active' ? '🟢 Activa' : party.status === 'waiting' ? '🟡 Esperando' : party.status === 'forming' ? '🟡 Armando' : '⚫ Finalizada'}
          </span>
          <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {party.isPrivate ? '🔒 Privada' : '🌎 Pública'}
          </span>
        </div>
      </div>
      <span className="party-members-count">
        👥 {party.members?.length ?? 0}
      </span>
    </div>
  )
}

// ─── TabBar ──────────────────────────────────────────────────────────────────
interface TabBarProps<T extends string> {
  tabs: Array<{ id: T; label: string }>
  active: T
  onChange: (tab: T) => void
}

export function TabBar<T extends string>({ tabs, active, onChange }: TabBarProps<T>) {
  return (
    <div className="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tab-item ${t.id === active ? 'tab-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── ChatBox ─────────────────────────────────────────────────────────────────
interface ChatBoxProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  currentUserId?: string
}

export function ChatBox({ messages, onSend, currentUserId = '' }: ChatBoxProps) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Sin mensajes todavía. ¡Sé el primero! 💬</p>
          </div>
        )}
        {messages.map((m) => {
          const isOwn = Boolean(currentUserId) && m.userId === currentUserId
          return (
            <div key={m.id} className={`chat-message${isOwn ? ' chat-message-own' : ''}`}>
              {!isOwn && (
                <span className="chat-username">{m.user?.displayName ?? m.userId.slice(0, 8)}</span>
              )}
              <p className="chat-text">{m.text}</p>
              <span className="chat-time">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      <form className="chat-input-row" onSubmit={submit}>
        <input
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí un mensaje..."
        />
        <Button type="submit" size="sm">Enviar</Button>
      </form>
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
      <div className="member-list">
        <button
          className="invite-btn"
          onClick={() => setShowInvite(true)}
        >
          <span>🔗</span>
          <span>Invitar miembros</span>
        </button>

        {isLeader && (
          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginTop: '8px' }} onClick={() => onVisibilityChange(!isPrivate)}>
            <input 
              type="checkbox" 
              checked={isPrivate} 
              onChange={() => onVisibilityChange(!isPrivate)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 600 }}>Party Privada 🔒</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ocultar la party en Matchmaking.</span>
            </div>
          </div>
        )}

        {members.map((m) => (
          <div
            key={m.id}
            className={`member-item${m.role === 'leader' ? ' member-item-leader' : ''}`}
          >
            {/* Avatar con indicador de presencia superpuesto */}
            <div className="member-avatar" style={{ position: 'relative' }}>
              {m.user.avatarUrl
                ? <img src={m.user.avatarUrl} alt={m.user.displayName} className="avatar-sm" />
                : <div className="avatar-placeholder-sm">{m.user.displayName[0]}</div>
              }
              <span
                className={`presence-dot presence-dot-${m.isOnline ? 'online' : 'offline'}`}
                title={m.isOnline ? 'En línea' : 'Desconectado'}
              />
            </div>

            <div className="member-info">
              <p className="member-name">
                {m.user.displayName}
                {/* Etiqueta de líder junto al nombre para que sea inmediatamente visible */}
                {m.role === 'leader' && (
                  <span className="member-leader-badge">👑 Líder</span>
                )}
              </p>
              <p className="member-username">@{m.user.username}</p>
            </div>

            <div className="member-stats">
              <span className="member-xp">⚡{m.user.stats?.xp ?? 0}</span>
              {/* Texto de estado de presencia */}
              <span className={`member-presence-label member-presence-label-${m.isOnline ? 'online' : 'offline'}`}>
                {m.isOnline ? 'En línea' : 'Desconectado'}
              </span>
              {isLeader && m.userId !== currentUserId && (
                <button
                  className="member-remove-btn"
                  title="Remover miembro"
                  onClick={() => onRemoveMember(m.userId)}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ─ Acciones del miembro ─ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        <button
          className="party-leave-btn"
          onClick={onLeave}
        >
          🚪 Salir de la party
        </button>

        {isLeader && (
          confirmClose ? (
            <div className="party-close-confirm">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                ¿Cerrás la party para todos?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="party-close-confirm-btn" onClick={onCloseParty}>
                  Sí, cerrar
                </button>
                <button className="party-close-cancel-btn" onClick={() => setConfirmClose(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              className="party-close-btn"
              onClick={() => setConfirmClose(true)}
            >
              🔒 Cerrar party
            </button>
          )
        )}
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
    <div className="invite-overlay" onClick={onClose}>
      <div className="invite-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="invite-sheet-handle" />
        <h2 className="invite-title">🔗 Invitar a la Party</h2>
        <p className="invite-sub">Compartí este link — expira en 24 horas</p>

        {isLoading && (
          <div className="center-spinner" style={{ minHeight: '80px' }}>
            <Spinner size="md" />
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--red)', fontSize: '14px', textAlign: 'center' }}>{error}</p>
        )}

        {link && !isLoading && (
          <>
            <div className="invite-link-box">
              <span className="invite-link-text">{link}</span>
              <button className="invite-copy-btn" onClick={handleCopy}>
                {copied ? '✓' : '📋'}
              </button>
            </div>
            {copied && <p className="invite-copied">¡Copiado al portapapeles!</p>}
            {'share' in navigator && (
              <Button variant="secondary" className="w-full" style={{ marginTop: '8px' }} onClick={handleShare}>
                📤 Compartir
              </Button>
            )}

            <div style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '10px' }}>Invitar a un amigo</h3>
              {isFriendsLoading ? (
                <div className="center-spinner" style={{ minHeight: '50px' }}>
                  <Spinner size="md" />
                </div>
              ) : friends.length ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {friends.map((friend) => (
                    <div key={friend.id} className="invite-friend-row">
                      <div>
                        <strong>{friend.displayName}</strong>
                        <p className="text-small">@{friend.username}</p>
                      </div>
                      <Button size="sm" variant="primary" onClick={() => inviteFriend(friend.id)}>
                        Invitar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-sub">No tenés amigos para invitar. Agregá amigos para invitarlos directamente.</p>
              )}
              {inviteSuccess && <p className="invite-copied" style={{ marginTop: '8px' }}>{inviteSuccess}</p>}
              {inviteError && <p style={{ color: 'var(--red)', fontSize: '14px', marginTop: '8px' }}>{inviteError}</p>}
            </div>
          </>
        )}

        <Button variant="ghost" className="w-full" style={{ marginTop: '12px' }} onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  )
}



// ─── UploadNoteCard ───────────────────────────────────────────────────────────
interface UploadNoteCardProps {
  onUpload: (title: string, subjectId: string, file?: File, noteText?: string) => Promise<void>
  isLoading: boolean
}

export function UploadNoteCard({ onUpload, isLoading }: UploadNoteCardProps) {
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [noteText, setNoteText] = useState('')
  const [expanded, setExpanded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    await onUpload(title, subjectId, file, noteText || undefined)
    setTitle('')
    setNoteText('')
    setExpanded(false)
  }

  if (!expanded) {
    return (
      <button className="upload-cta" onClick={() => setExpanded(true)}>
        <span className="upload-cta-icon">✨</span>
        <span>Crear Quest con IA</span>
        <span className="upload-cta-sub">Subí un apunte → quiz automático</span>
      </button>
    )
  }

  return (
    <form className="upload-card" onSubmit={submit}>
      <h3 className="upload-title">Nueva Quest</h3>
      <input
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del quiz..."
        required
      />
      <input
        className="input"
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
        placeholder="ID de la materia"
        required
      />
      <textarea
        className="input input-textarea"
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Pegá el texto del apunte aquí (o subí un PDF)..."
        rows={4}
      />
      <label className="upload-file-label">
        <input ref={fileRef} type="file" accept="application/pdf" hidden />
        📎 Subir PDF (opcional)
      </label>
      <div className="upload-actions">
        <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>Cancelar</Button>
        <Button type="submit" isLoading={isLoading}>Generar Quest ⚡</Button>
      </div>
    </form>
  )
}

// ─── QuestCard ───────────────────────────────────────────────────────────────
export function QuestCard({ quest }: { quest: Quest }) {
  const navigate = useNavigate()
  return (
    <div className="quest-card" onClick={() => navigate(`/quiz/${quest.id}`)}>
      <div className="quest-card-info">
        <p className="quest-card-title">{quest.title}</p>
        <p className="quest-card-meta">{quest.questions?.length ?? 0} preguntas</p>
      </div>
      <span className={`quest-status quest-status-${quest.status}`}>
        {quest.status === 'pending' ? '⏳' : quest.status === 'active' ? '▶' : '✅'}
      </span>
    </div>
  )
}

// ─── ActivityFeed ────────────────────────────────────────────────────────────
export interface Activity {
  id: string
  type: string
  description: string
  user?: { id: string; displayName: string; avatarUrl?: string | null }
  createdAt: string
  metadata?: Record<string, unknown>
}

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
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Spinner size="sm" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
        <p>Sin actividad todavía</p>
      </div>
    )
  }

  return (
    <div className="activity-feed">
      {activities.map((activity) => (
        <div key={activity.id} className="activity-item">
          <div className="activity-dot" style={{ backgroundColor: getActivityColor(activity.type) }} />
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-emoji">{getActivityEmoji(activity.type)}</span>
              {activity.user && (
                <span className="activity-user">{activity.user.displayName}</span>
              )}
            </div>
            <p className="activity-description">{activity.description}</p>
            <span className="activity-time">
              {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
