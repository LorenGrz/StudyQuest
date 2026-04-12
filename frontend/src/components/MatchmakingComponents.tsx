import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Socket } from 'socket.io-client'
import type { User } from '../services/userService'
import { Button } from './UI'

// ─── SubjectSelector ─────────────────────────────────────────────────────────
interface SubjectSelectorProps {
  onConfirm: () => void
  user: User | null
}

export function SubjectSelector({ onConfirm, user }: SubjectSelectorProps) {
  const subjects = user?.enrolledSubjects ?? []
  return (
    <div className="matchmaking-idle">
      <div className="matchmaking-hero">
        <span className="matchmaking-hero-icon">🎮</span>
        <h1 className="matchmaking-title">Find Your Party</h1>
        <p className="matchmaking-subtitle">
          Te vamos a conectar con estudiantes de tus materias
        </p>
      </div>
      <div className="matchmaking-subjects">
        {subjects.length === 0 ? (
          <p className="matchmaking-no-subjects">
            Inscribite a materias primero para hacer matchmaking
          </p>
        ) : (
          subjects.map((s) => (
            <div key={s.id} className="matchmaking-subject-chip">
              📚 {s.name}
            </div>
          ))
        )}
      </div>
      <Button
        size="lg"
        className="matchmaking-btn"
        onClick={onConfirm}
        disabled={subjects.length === 0}
      >
        ⚡ Buscar Party
      </Button>
    </div>
  )
}

// ─── SearchAnimation ─────────────────────────────────────────────────────────
export function SearchAnimation() {
  return (
    <div className="search-animation">
      <div className="radar">
        <div className="radar-ring ring-1" />
        <div className="radar-ring ring-2" />
        <div className="radar-ring ring-3" />
        <div className="radar-center">🧑‍💻</div>
        <div className="radar-sweep" />
      </div>
      <p className="search-label">Buscando compañeros de estudio...</p>
      <p className="search-sub">Puede tomar unos segundos</p>
    </div>
  )
}

// ─── PartyPreview ──────────────────────────────────────────────────────────────
interface PartyPreviewProps {
  onAccept: () => void
  party?: { members: Array<{ username?: string; displayName?: string; userId?: string }> }
}

export function PartyPreview({ onAccept, party }: PartyPreviewProps) {
  const members = party?.members ?? []
  return (
    <div className="party-preview">
      <div className="party-preview-icon">🎉</div>
      <h2 className="party-preview-title">¡Party encontrada!</h2>
      <div className="party-preview-members">
        {members.map((m, i) => {
          const name = m.displayName ?? `Jugador ${i + 1}`;
          const key = m.username ?? m.userId ?? i;
          return (
            <div key={key} className="party-preview-member">
              <div className="avatar-placeholder">{name[0]}</div>
              <p>{name}</p>
            </div>
          )
        })}
      </div>
      <Button size="lg" onClick={onAccept}>✅ Aceptar</Button>
    </div>
  )
}

// ─── WaitingForAll ────────────────────────────────────────────────────────────
export function WaitingForAll({ confirmed = 0, total = 4 }: { confirmed?: number; total?: number }) {
  return (
    <div className="waiting-screen">
      <div className="waiting-icon">⏳</div>
      <h2 className="waiting-title">Esperando confirmación</h2>
      <div className="waiting-dots">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`waiting-dot ${i < confirmed ? 'waiting-dot-done' : ''}`} />
        ))}
      </div>
      <p className="waiting-sub">{confirmed} / {total} confirmaron</p>
    </div>
  )
}
