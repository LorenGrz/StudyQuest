import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Swords,
  Shield,
  User,
  BookOpen,
  Users,
  Trophy,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

type NavItem = { path: string; label: string; Icon: typeof Home }

// Shown in both the desktop sidebar and the mobile bottom bar.
export const PRIMARY_NAV: readonly NavItem[] = [
  { path: '/dashboard', label: 'Inicio', Icon: Home },
  { path: '/match', label: 'Match', Icon: Swords },
  { path: '/parties', label: 'Parties', Icon: Shield },
  { path: '/profile', label: 'Perfil', Icon: User },
]

// Sidebar only (mobile reaches these from in-page buttons).
export const SIDEBAR_EXTRA_NAV: readonly NavItem[] = [
  { path: '/subjects', label: 'Materias', Icon: BookOpen },
  { path: '/friends', label: 'Amigos', Icon: Users },
  { path: '/tournaments', label: 'Torneos', Icon: Trophy },
]

export function useIsActive(path: string): boolean {
  const { pathname } = useLocation()
  if (path === '/parties') {
    return pathname === '/parties' || pathname.startsWith('/party/')
  }
  return pathname === path
}

function SidebarLink({ path, label, Icon }: NavItem) {
  const active = useIsActive(path)
  return (
    <Link
      to={path}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center gap-3 px-3 h-11 rounded-lg text-[14px] font-semibold',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        active
          ? 'text-accent-light bg-[var(--accent-bg)]'
          : 'text-muted hover:text-primary hover:bg-elevated',
      ].join(' ')}
    >
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  )
}

export function DesktopSidebar() {
  const { logout } = useAuth()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 shrink-0 border-r border-edge bg-surface">
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-5 py-5 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="text-xl">⚡</span>
        <span className="text-[17px] font-extrabold tracking-tight">
          StudyQuest
        </span>
      </Link>

      <nav
        className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto"
        aria-label="Navegación principal"
      >
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.path} {...item} />
        ))}
        <div className="my-2 border-t border-edge" />
        {SIDEBAR_EXTRA_NAV.map((item) => (
          <SidebarLink key={item.path} {...item} />
        ))}
      </nav>

      <div className="mt-auto px-3 pb-4 pt-2 border-t border-edge flex flex-col gap-1">
        <SidebarLink path="/settings" label="Ajustes" Icon={Settings} />
        <button
          onClick={() => void logout()}
          className="flex items-center gap-3 px-3 h-11 rounded-lg text-[14px] font-semibold text-muted hover:text-danger hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <LogOut size={20} aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

function BottomNavLink({ path, label, Icon }: NavItem) {
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
      <span className="text-[12px] font-semibold uppercase tracking-[0.5px]">
        {label}
      </span>
    </Link>
  )
}

export function BottomNav() {
  return (
    <nav
      className="lg:hidden shrink-0 border-t border-edge bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label="Navegación principal"
    >
      <div className="flex justify-around mx-auto w-full max-w-[480px]">
        {PRIMARY_NAV.map((item) => (
          <BottomNavLink key={item.path} {...item} />
        ))}
      </div>
    </nav>
  )
}
