import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { Badge } from '../../components/UI'
import { AvatarWithBorder } from '../../components/AvatarWithBorder'

interface ProfileHeaderProps {
  user: any
  stats: any
  league: any
}

export function ProfileHeader({ user, stats, league }: ProfileHeaderProps) {
  return (
    <div
      className="relative bg-surface border border-[var(--overlay-border)] rounded-xl p-6 pr-14 flex gap-4 items-center"
      style={{ borderTop: `3px solid ${league.color}` }}
    >
      <Link
        to="/settings"
        aria-label="Configuración"
        className="absolute top-3 right-3 flex items-center justify-center size-11 rounded-lg text-muted transition-colors hover:text-primary hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Settings size={18} aria-hidden="true" />
      </Link>
      <AvatarWithBorder
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        borderImageUrl={user.activeCosmetics?.borderImageUrl}
        size="lg"
        glowColor={league.glowColor}
      />
      <div className="flex flex-col gap-1 min-w-0">
        <h2 className="font-bold text-primary truncate">{user.displayName}</h2>
        <p className="text-muted text-sm truncate">@{user.username}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="primary">Nivel {stats.level}</Badge>
          <Badge variant="success">⚡ {stats.xp} XP</Badge>
          <span
            className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-bold text-on-accent text-shadow-[0_1px_3px_rgba(0,0,0,0.4)] tracking-[0.3px] relative z-[1]"
            style={{
              background: league.gradient,
              boxShadow: `0 0 8px ${league.glowColor}`,
            }}
          >
            {league.icon} {league.name}
          </span>
        </div>
      </div>
    </div>
  )
}
