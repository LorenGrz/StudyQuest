import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

// ─── PageContainer ───────────────────────────────────────────────────────────
export function PageContainer({
  children,
  width = 'wide',
}: {
  children: ReactNode
  width?: 'narrow' | 'wide'
}) {
  const maxWidth = width === 'narrow' ? 'max-w-2xl' : 'max-w-5xl'
  return (
    <div className={`w-full mx-auto px-4 sm:px-5 lg:px-6 py-4 sm:py-6 ${maxWidth}`}>
      {children}
    </div>
  )
}

// ─── PageHeader ──────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string
  subtitle?: string
  back?: () => void
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <button
            onClick={back}
            aria-label="Volver"
            title="Volver"
            className="flex items-center justify-center min-h-11 min-w-11 rounded-lg text-secondary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-primary truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-secondary mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ─── Surface ─────────────────────────────────────────────────────────────────
export function Surface({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-surface border border-edge rounded-lg px-4 sm:px-5 lg:px-6 py-4 ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Alert ───────────────────────────────────────────────────────────────────
export function Alert({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div
      role="alert"
      className="bg-surface border border-edge rounded-lg px-4 sm:px-5 py-4 flex flex-col gap-3"
    >
      <div>
        <p className="font-semibold text-primary">{title}</p>
        {description && (
          <p className="text-sm text-secondary mt-1">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="self-start inline-flex items-center justify-center min-h-11 px-4 rounded-lg bg-accent text-on-accent font-semibold text-sm transition-colors hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center">
      <div className="text-4xl" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="text-lg font-semibold text-primary">{title}</p>
        {description && (
          <p className="text-sm text-secondary mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── SegmentedTabs ───────────────────────────────────────────────────────────
export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: Array<{ id: T; label: string; icon?: ReactNode }>
  active: T
  onChange: (id: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex w-full items-center gap-1 bg-[var(--overlay-subtle)] border border-edge rounded-lg p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 px-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive
                ? 'bg-accent text-on-accent'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
