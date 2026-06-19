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
    <div className="flex flex-col items-center gap-6 max-w-[360px] w-full text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-[64px]">🎮</span>
        <h1 className="text-[28px] font-extrabold">Find Your Party</h1>
        <p className="text-secondary">
          Te vamos a conectar con estudiantes de tus materias
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {subjects.length === 0 ? (
          <p className="text-muted text-sm">
            Inscribite a materias primero para hacer matchmaking
          </p>
        ) : (
          subjects.map((s) => (
            <div key={s.id} className="bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] rounded-full px-3.5 py-1.5 text-[13px] font-medium">
              📚 {s.name}
            </div>
          ))
        )}
      </div>
      <Button
        size="lg"
        className="min-w-[200px]"
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
    <div className="flex flex-col items-center gap-8">
      <div className="relative w-[200px] h-[200px] flex items-center justify-center">
        <div className="absolute rounded-full border border-[rgba(124,58,237,0.4)] animate-radar w-[60px] h-[60px] [animation-delay:0s]" />
        <div className="absolute rounded-full border border-[rgba(124,58,237,0.4)] animate-radar w-[120px] h-[120px] [animation-delay:0.5s]" />
        <div className="absolute rounded-full border border-[rgba(124,58,237,0.4)] animate-radar w-[180px] h-[180px] [animation-delay:1s]" />
        <div className="text-[32px] z-[1]">🧑‍💻</div>
        <div className="absolute inset-0 rounded-full border-2 border-[rgba(124,58,237,0.6)] border-t-transparent animate-spin" style={{ animationDuration: '2s' }} />
      </div>
      <p className="text-lg font-bold">Buscando compañeros de estudio...</p>
      <p className="text-sm text-muted">Puede tomar unos segundos</p>
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
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="text-[60px]">🎉</div>
      <h2 className="text-2xl font-extrabold">¡Party encontrada!</h2>
      <div className="flex gap-4 justify-center flex-wrap">
        {members.map((m, i) => {
          const name = m.displayName ?? `Jugador ${i + 1}`;
          const key = m.username ?? m.userId ?? i;
          return (
            <div key={key} className="flex flex-col items-center gap-1.5 text-[13px]">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center font-extrabold text-lg text-white">{name[0]}</div>
              <p>{name}</p>
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <Button size="lg" onClick={onAccept}>✅ Aceptar</Button>
      </div>
    </div>
  )
}

// ─── WaitingForAll ────────────────────────────────────────────────────────────
export function WaitingForAll({ confirmed = 0, total = 4 }: { confirmed?: number; total?: number }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="text-5xl">⏳</div>
      <h2 className="text-[22px] font-bold">Esperando confirmación</h2>
      <div className="flex gap-2.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border border-white/8 transition-all duration-300 ${i < confirmed ? 'bg-success border-success shadow-[0_0_8px_var(--color-success)]' : 'bg-elevated'}`}
          />
        ))}
      </div>
      <p className="text-secondary">{confirmed} / {total} confirmaron</p>
    </div>
  )
}
