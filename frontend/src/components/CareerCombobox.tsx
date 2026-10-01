import { useId, useMemo, useState } from 'react'
import type { Career } from '../services/universityService'
import { OTHER_CAREER_LABEL, OTHER_CAREER_VALUE } from '../utils/careers'

interface CareerComboboxProps {
  id: string
  label: string
  careers: Career[]
  /** A career id, OTHER_CAREER_VALUE, or '' when nothing is picked. */
  value: string
  onChange: (careerId: string) => void
  disabled?: boolean
  required?: boolean
}

interface Option {
  value: string
  label: string
  hint: string | null
}

/** Lowercase without accents, so "programacion" finds "Programación". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Searchable career picker (register + edit profile). Typing filters the
 * catalog careers by name or faculty; "Otra (no está en la lista)" is always
 * offered last so the free-text request path stays reachable.
 */
export function CareerCombobox({
  id,
  label,
  careers,
  value,
  onChange,
  disabled = false,
  required = false,
}: CareerComboboxProps) {
  const listId = useId()
  const [query, setQuery] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const selectedLabel =
    value === OTHER_CAREER_VALUE
      ? OTHER_CAREER_LABEL
      : (careers.find((c) => c.id === value)?.name ?? '')

  const options: Option[] = useMemo(() => {
    const needle = normalize(query ?? '').trim()
    const matches = careers
      .filter(
        (c) =>
          !needle ||
          normalize(c.name).includes(needle) ||
          normalize(c.faculty ?? '').includes(needle),
      )
      .map((c) => ({ value: c.id, label: c.name, hint: c.faculty }))
    return [...matches, { value: OTHER_CAREER_VALUE, label: OTHER_CAREER_LABEL, hint: null }]
  }, [careers, query])

  const pick = (option: Option) => {
    onChange(option.value)
    setQuery(null)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault()
      const option = options[activeIndex]
      if (option) pick(option)
    } else if (e.key === 'Escape') {
      setQuery(null)
      setIsOpen(false)
    }
  }

  const activeId = isOpen && options[activeIndex] ? `${listId}-${activeIndex}` : undefined

  return (
    <div className="flex flex-col gap-1.5 relative">
      <label className="text-[13px] font-medium text-secondary" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        className="w-full min-h-11 px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60"
        placeholder={disabled ? 'Elegí primero la universidad' : 'Buscá tu carrera...'}
        value={query ?? selectedLabel}
        disabled={disabled}
        required={required && !value}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setQuery(null)
          setIsOpen(false)
        }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && !disabled && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Opciones de ${label.toLowerCase()}`}
          className="absolute top-full left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--overlay-border)] bg-elevated shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`px-3.5 py-2.5 cursor-pointer text-sm ${
                index === activeIndex ? 'bg-accent/15 text-primary' : 'text-secondary'
              }`}
              // mousedown, not click: it fires before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault()
                pick(option)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="block text-primary">{option.label}</span>
              {option.hint && <span className="block text-xs text-muted">{option.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
