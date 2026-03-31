import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function MobileLayout({ children }: Props) {
  return (
    <div className="mobile-layout">
      <main className="mobile-main">{children}</main>
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  const { pathname } = useLocation()

  const tabs = [
    { path: '/dashboard', label: 'Inicio', icon: '🏠' },
    { path: '/matchmaking', label: 'Match', icon: '⚔️' },
    { path: '/parties', label: 'Partys', icon: '🛡️' },
    { path: '/profile', label: 'Perfil', icon: '👤' },
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path || (tab.path === '/parties' && pathname.startsWith('/party/'))
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
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
