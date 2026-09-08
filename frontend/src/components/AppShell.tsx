import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Home, Swords, Shield, User } from 'lucide-react'

interface Props {
  children: ReactNode
}

const destinations = [
  { path: '/dashboard', label: 'Inicio', Icon: Home },
  { path: '/match', label: 'Match', Icon: Swords },
  { path: '/parties', label: 'Parties', Icon: Shield },
  { path: '/profile', label: 'Perfil', Icon: User },
] as const

function useIsActive(path: string): boolean {
  const { pathname } = useLocation()
  if (path === '/parties') {
    return pathname === '/parties' || pathname.startsWith('/party/')
  }
  return pathname === path
}

function NavLink({ path, label, Icon }: { path: string; label: string; Icon: typeof Home }) {
  const active = useIsActive(path)
  return (
    <Link
      to={path}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={[
        'flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-11',
        'transition-colors active:scale-95 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        active ? 'text-accent-light' : 'text-muted hover:text-primary',
      ].join(' ')}
    >
      <Icon size={22} aria-hidden="true" />
      <span className="text-[12px] font-semibold uppercase tracking-[0.5px]">{label}</span>
    </Link>
  )
}

// Centered column: phone-width on mobile, roomier on tablet/desktop so pages
// don't look stuck in a phone frame on a big screen. The bottom navigation stays
// a phone-width strip at the foot of the column, never a desktop rail.
export function AppShell({ children }: Props) {
  return (
    <div className="h-dvh w-full bg-base text-primary flex justify-center">
      <div className="flex h-dvh w-full max-w-[480px] md:max-w-2xl lg:max-w-4xl flex-col overflow-hidden bg-base">
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
          {children}
        </main>
        <nav
          className="shrink-0 border-t border-edge bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
          aria-label="Navegación principal"
        >
          <div className="flex justify-around mx-auto w-full max-w-[480px]">
            {destinations.map(({ path, label, Icon }) => (
              <NavLink key={path} path={path} label={label} Icon={Icon} />
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
