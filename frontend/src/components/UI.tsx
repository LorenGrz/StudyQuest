import React, { useState } from 'react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, X } from 'lucide-react'

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  startIcon?: ReactNode
  endIcon?: ReactNode
  children: ReactNode
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-light hover:shadow-[0_0_24px_rgba(124,58,237,0.3)] hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-elevated text-primary border border-[var(--overlay-border)] hover:border-[var(--border-hover)] hover:bg-panel disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(127,29,29,0.7)] hover:border-[rgba(248,113,113,0.45)] hover:text-[#fca5a5] disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizeClasses: Record<string, string> = {
  sm: 'min-h-11 py-[7px] px-3.5 text-[13px]',
  md: 'min-h-11 py-[11px] px-5 text-[15px]',
  lg: 'min-h-11 py-3.5 px-6 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  startIcon,
  endIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      whileHover={(!disabled && !isLoading) ? { scale: 1.02 } : undefined}
      whileTap={(!disabled && !isLoading) ? { scale: 0.98 } : undefined}
      {...(props as any)}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 rounded-full border-2 border-[var(--overlay-border)] border-t-accent animate-spin" />
      ) : (
        <>
          {startIcon && <span aria-hidden="true">{startIcon}</span>}
          {children}
          {endIcon && <span aria-hidden="true">{endIcon}</span>}
        </>
      )}
    </motion.button>
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  children: ReactNode
}

const badgeVariantClasses: Record<string, string> = {
  primary: 'bg-[rgba(124,58,237,0.1)] text-accent-light',
  success: 'bg-[rgba(16,185,129,0.1)] text-success',
  warning: 'bg-[rgba(245,158,11,0.1)] text-warning',
  danger: 'bg-[rgba(239,68,68,0.1)] text-danger',
  neutral: 'bg-elevated text-secondary',
}

export function Badge({ variant = 'primary', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold uppercase tracking-[0.5px] ${badgeVariantClasses[variant]}`}
    >
      {children}
    </span>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
const spinnerSizeClasses: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={`rounded-full border-2 border-[var(--overlay-border)] border-t-accent animate-spin ${spinnerSizeClasses[size]}`}
    />
  )
}

// ─── SectionTitle ────────────────────────────────────────────────────────────
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-bold text-secondary uppercase tracking-[1px] pt-4 pb-1">
      {children}
    </h2>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  /** Fixed, non-editable text shown inside the field before the value (e.g. "@"). */
  prefix?: string
}

export function Input({ label, error, prefix, className = '', id, ...props }: InputProps) {
  const input = (
    <input
      id={id}
      className={`w-full min-h-11 ${prefix ? 'pl-8 pr-3.5' : 'px-3.5'} py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
  )

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium text-secondary" htmlFor={id}>
          {label}
        </label>
      )}
      {prefix ? (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-muted select-none"
          >
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export function Select({ label, error, options, className = '', id, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium text-secondary" htmlFor={id}>
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full min-h-11 px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none appearance-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </div>
  )
}

// ─── Reveal ──────────────────────────────────────────────────────────────────
// Fade + slide-up on mount. Give siblings an increasing `delay` to stagger a
// list of sections so the page unfolds instead of snapping in. Pure CSS
// animation (see `@utility reveal` in index.css) so it can never get stuck at
// opacity 0 the way a JS animation can if its frame loop is throttled.
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <div className={`reveal ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  )
}

// ─── Collapsible ─────────────────────────────────────────────────────────────
// Collapsible section with a full-width header button (title + optional
// summary badge + rotating chevron). Open state persists per `id` in
// localStorage so a user's choice survives navigation; `forceOpen` overrides
// it while true (e.g. to keep an error visible) without losing the stored
// preference underneath.
const COLLAPSIBLE_STORAGE_PREFIX = 'sq:collapsible:'

function readStoredOpen(id: string): boolean | null {
  try {
    const raw = localStorage.getItem(`${COLLAPSIBLE_STORAGE_PREFIX}${id}`)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

function writeStoredOpen(id: string, open: boolean) {
  try {
    localStorage.setItem(`${COLLAPSIBLE_STORAGE_PREFIX}${id}`, String(open))
  } catch {
    // Storage unavailable (private mode, quota, disabled) — keep the in-memory state only.
  }
}

interface CollapsibleProps {
  id: string
  title: ReactNode
  summary?: ReactNode
  defaultOpen?: boolean
  forceOpen?: boolean
  children: ReactNode
}

export function Collapsible({
  id,
  title,
  summary,
  defaultOpen = false,
  forceOpen = false,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(() => readStoredOpen(id) ?? defaultOpen)
  const shouldReduceMotion = useReducedMotion()
  const contentId = `${id}-collapsible-content`
  const isOpen = forceOpen || open

  const toggle = () => {
    if (forceOpen) return
    setOpen((prev) => {
      const next = !prev
      writeStoredOpen(id, next)
      return next
    })
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 pt-4 pb-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-base font-bold text-secondary uppercase tracking-[1px] truncate">
            {title}
          </span>
          {summary != null && <Badge variant="neutral">{summary}</Badge>}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          className="text-secondary shrink-0"
          aria-hidden="true"
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────
// Centered dialog. Mount/unmount it from the parent (optionally inside
// <AnimatePresence> for the exit animation), e.g. {open && <Modal .../>}.
interface ModalProps {
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ onClose, title, children, size = 'md' }: ModalProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const maxW =
    size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[3px]"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        className={`w-full ${maxW} max-h-[85vh] overflow-y-auto bg-surface border border-[var(--overlay-border)] rounded-2xl shadow-xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface px-5 py-4 border-b border-[var(--overlay-border)]">
          <h2 className="text-[17px] font-bold text-primary">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex items-center justify-center w-8 h-8 -mr-1 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}
