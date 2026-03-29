import type { Subject } from '../services/userService'
import { Button, Badge } from './UI'

// ─── SearchBar ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        className="search-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar materia..."
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
    <div className="filter-chips">
      <button
        className={`chip ${!filters.semester ? 'chip-active' : ''}`}
        onClick={() => onChange({ ...filters, semester: null })}
      >
        Todos
      </button>
      {semesters.map((s) => (
        <button
          key={s}
          className={`chip ${filters.semester === s ? 'chip-active' : ''}`}
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
      <div className="empty-state">
        <p className="empty-icon">📚</p>
        <p className="empty-text">No se encontraron materias</p>
      </div>
    )
  }

  return (
    <div className="subject-list">
      {subjects.map((s) => (
        <div key={s.id} className="subject-list-item">
          <div className="subject-list-info">
            <p className="subject-list-name">{s.name}</p>
            <p className="subject-list-meta">{s.career} · Sem. {s.semester}</p>
            {s.description && <p className="subject-list-desc">{s.description}</p>}
          </div>
          <div className="subject-list-action">{renderAction(s)}</div>
        </div>
      ))}
    </div>
  )
}
