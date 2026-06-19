import React from 'react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

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
    'bg-accent text-white hover:bg-accent-light hover:shadow-[0_0_24px_rgba(124,58,237,0.3)] hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-elevated text-primary border border-white/8 hover:border-white/[0.15] hover:bg-panel disabled:opacity-50 disabled:cursor-not-allowed',
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
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 rounded-full border-2 border-white/8 border-t-accent animate-spin" />
      ) : (
        <>
          {startIcon && <span aria-hidden="true">{startIcon}</span>}
          {children}
          {endIcon && <span aria-hidden="true">{endIcon}</span>}
        </>
      )}
    </button>
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
      className={`rounded-full border-2 border-white/8 border-t-accent animate-spin ${spinnerSizeClasses[size]}`}
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
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium text-secondary" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full min-h-11 px-3.5 py-3 bg-panel border border-white/8 rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      />
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
        className={`w-full min-h-11 px-3.5 py-3 bg-panel border border-white/8 rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none appearance-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ${error ? 'border-danger' : ''} ${className}`}
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
