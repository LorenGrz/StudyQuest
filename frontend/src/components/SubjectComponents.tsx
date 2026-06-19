import { Search } from 'lucide-react'
import type { Subject } from '../services/userService'
import { EmptyState } from './PagePrimitives'

// ─── SearchBar ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search
        size={16}
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
      <input
        className="w-full min-h-11 pl-9 pr-3.5 py-3 bg-panel border border-white/8 rounded-lg text-primary text-[15px] placeholder:text-muted transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar materia..."
        aria-label="Buscar materia"
      />
    </div>
  )
}

// ─── FilterChips ─────────────────────────────────────────────────────────────
interface FilterChipsProps {
  filters: { career: string; semester: number | null }
  onChange: (f: { career: string; semester: number | null }) => void
}

const semesters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function FilterChips({ filters, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      <button
        className={`flex-shrink-0 min-h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          !filters.semester
            ? 'bg-accent text-white'
            : 'bg-elevated text-secondary hover:text-primary border border-white/8'
        }`}
        onClick={() => onChange({ ...filters, semester: null })}
      >
        Todos
      </button>
      {semesters.map((s) => (
        <button
          key={s}
          className={`flex-shrink-0 min-h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            filters.semester === s
              ? 'bg-accent text-white'
              : 'bg-elevated text-secondary hover:text-primary border border-white/8'
          }`}
          onClick={() => onChange({ ...filters, semester: s === filters.semester ? null : s })}
        >
          Sem. {s}
        </button>
      ))}
    </div>
  )
}

// ─── SubjectList ─────────────────────────────────────────────────────────────
interface SubjectListProps {
  subjects: Subject[]
  renderAction: (subject: Subject) => React.ReactNode
}

export function SubjectList({ subjects, renderAction }: SubjectListProps) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        icon="📚"
        title="No se encontraron materias"
        description="Intentá con otra búsqueda o cambiá los filtros."
      />
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {subjects.map((s) => (
        <div
          key={s.id}
          className="flex items-start justify-between gap-3 bg-surface border border-edge rounded-lg px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-primary leading-snug">{s.name}</p>
            <p className="text-[13px] text-secondary mt-0.5">{s.career} · Sem. {s.semester}</p>
            {s.description && (
              <p className="text-[13px] text-muted mt-1 line-clamp-3">{s.description}</p>
            )}
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            {renderAction(s)}
          </div>
        </div>
      ))}
    </div>
  )
}
