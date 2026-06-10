import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function MobileLayout({ children }: Props) {
  return (
    <div className="w-full max-w-[480px] mx-auto self-center h-dvh flex flex-col bg-base overflow-hidden">
      <main className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-hidden pb-6">{children}</main>
      <BottomNav />
    </div>
  )
}

export function BottomNav() {
  const { pathname } = useLocation()

  const tabs = [
    { path: '/dashboard', label: 'Inicio', icon: '🏠' },
    { path: '/match', label: 'Match', icon: '⚔️' },
    { path: '/parties', label: 'Partys', icon: '🛡️' },
    { path: '/profile', label: 'Perfil', icon: '👤' },
  ]

  return (
    <nav className="w-full h-[70px] bg-surface/95 backdrop-blur-md border-t border-white/8 flex justify-around items-center shrink-0 pb-[env(safe-area-inset-bottom)] z-50">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path || (tab.path === '/parties' && pathname.startsWith('/party/'))
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex flex-col items-center gap-1 text-muted transition-all duration-200 flex-1 py-2 active:scale-95 ${isActive ? 'text-accent-light' : ''}`}
          >
            <span className={`text-[22px] transition-all duration-200 ${isActive ? '-translate-y-[2px] scale-110 drop-shadow-[0_0_8px_rgba(157,93,247,0.5)]' : ''}`}>{tab.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px]">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AuthLayout({ children }: Props) {
  return (
    <div className="h-full flex items-center justify-center p-4 bg-gradient-to-t from-base via-base to-purple-950/15 overflow-y-auto">
      <div className="w-full max-w-[420px] bg-surface border border-white/8 rounded-3xl p-8 flex flex-col gap-6">
        <div className="text-center">
          <span className="text-[48px] block mb-2">⚡</span>
          <h1 className="text-[28px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-purple-700">StudyQuest</h1>
          <p className="text-muted text-sm mt-1">Estudia. Compite. Gana.</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function GameLayout({ children }: Props) {
  return (
    <div className="h-full bg-gradient-to-b from-base to-elevated flex flex-col max-w-[480px] mx-auto self-center w-full overflow-y-auto">
      {children}
    </div>
  )
}

export function FullscreenLayout({ children }: Props) {
  return (
    <div className="w-full max-w-[480px] mx-auto self-center h-dvh flex flex-col bg-base overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
