import { useRef, useState } from 'react'
import type { Party, ChatMessage, PartyMember } from '../services/partyService'
import type { Quest } from '../services/questService'
import { Button, Spinner } from './UI'
import { useNavigate } from 'react-router-dom'

// ─── PartyHeader ─────────────────────────────────────────────────────────────
export function PartyHeader({ party }: { party: Party | null }) {
  if (!party) return null
  return (
    <div className="party-header">
      <div className="party-header-info">
        <h1 className="party-header-name">{party.name}</h1>
        <span className={`party-status party-status-${party.status}`}>
          {party.status === 'active' ? '🟢 Activa' : party.status === 'waiting' ? '🟡 Esperando' : '⚫ Finalizada'}
        </span>
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
export function ChatBox({ messages, onSend }: { messages: ChatMessage[]; onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className="chat-message">
            <span className="chat-username">{m.user?.displayName ?? m.userId.slice(0, 8)}</span>
            <p className="chat-text">{m.text}</p>
            <span className="chat-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
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
export function MemberList({ members }: { members: PartyMember[] }) {
  return (
    <div className="member-list">
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
