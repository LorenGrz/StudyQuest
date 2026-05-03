import { useRef, useState, useEffect } from 'react'
import type { Party, ChatMessage, PartyMember } from '../services/partyService'
import { partyService } from '../services/partyService'
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
}

export function MemberList({ members, partyId, isPrivate, currentUserId, onVisibilityChange }: MemberListProps) {
  const [showInvite, setShowInvite] = useState(false)
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
          <div key={m.id} className="member-item">
            <div className="member-avatar">
              {m.user.avatarUrl
                ? <img src={m.user.avatarUrl} alt={m.user.displayName} className="avatar-sm" />
                : <div className="avatar-placeholder-sm">{m.user.displayName[0]}</div>
              }
            </div>
            <div className="member-info">
              <p className="member-name">{m.user.displayName}</p>
              <p className="member-username">@{m.user.username}</p>
            </div>
            <div className="member-stats">
              <span className="member-xp">⚡{m.user.stats?.xp ?? 0}</span>
              {m.role === 'leader' && <span className="member-leader">👑</span>}
            </div>
          </div>
        ))}
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    partyService.generateInvite(partyId)
      .then(({ token }) => {
        const base = window.location.origin
        setLink(`${base}/join/${token}`)
      })
      .catch(() => setError('No se pudo generar el link'))
      .finally(() => setIsLoading(false))
  }, [partyId])

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
