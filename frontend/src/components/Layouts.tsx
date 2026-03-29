import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function MobileLayout({ children }: Props) {
  return (
    <div className="mobile-layout">
      <main className="mobile-main">{children}</main>
    </div>
  )
}

export function AuthLayout({ children }: Props) {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⚡</span>
          <h1 className="auth-logo-text">StudyQuest</h1>
          <p className="auth-logo-tagline">Estudia. Compite. Gana.</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function GameLayout({ children }: Props) {
  return (
    <div className="game-layout">
      {children}
    </div>
  )
}

export function FullscreenLayout({ children }: Props) {
  return (
    <div className="fullscreen-layout">
      {children}
    </div>
  )
}
