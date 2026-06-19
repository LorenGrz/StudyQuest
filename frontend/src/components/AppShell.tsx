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

function NavLink({
  path,
  label,
  Icon,
  variant,
}: {
  path: string
  label: string
  Icon: typeof Home
  variant: 'rail' | 'bottom'
}) {
  const active = useIsActive(path)

  if (variant === 'rail') {
    return (
      <Link
        to={path}
        aria-current={active ? 'page' : undefined}
        title={label}
        aria-label={label}
        className={[
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          'min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          active
            ? 'bg-elevated text-accent-light'
            : 'text-muted hover:bg-elevated hover:text-primary',
        ].join(' ')}
      >
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    )
  }

  // bottom nav variant
  return (
    <Link
      to={path}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={[
        'flex flex-col items-center gap-1 flex-1 py-2 min-h-11 justify-center',
        'transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md',
        active ? 'text-accent-light' : 'text-muted hover:text-primary',
      ].join(' ')}
    >
      <Icon size={22} aria-hidden="true" />
      <span className="text-[12px] font-semibold uppercase tracking-[0.5px]">{label}</span>
    </Link>
  )
}

export function AppShell({ children }: Props) {
  return (
    <div className="h-dvh w-full bg-base text-primary lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Desktop sidebar rail */}
      <aside className="hidden border-r border-edge bg-surface lg:flex lg:flex-col">
        <div className="flex h-14 items-center px-4 font-extrabold text-lg text-accent-light">
          StudyQuest
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2" aria-label="Navegación principal">
          {destinations.map(({ path, label, Icon }) => (
            <NavLink key={path} path={path} label={label} Icon={Icon} variant="rail" />
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="min-w-0 overflow-y-auto pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navegación principal"
      >
        <div className="flex justify-around">
          {destinations.map(({ path, label, Icon }) => (
            <NavLink key={path} path={path} label={label} Icon={Icon} variant="bottom" />
          ))}
        </div>
      </nav>
    </div>
  )
}
