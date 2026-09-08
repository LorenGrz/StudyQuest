import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { User } from '../../services/userService'
import type { Party } from '../../services/partyService'
import type { Subject } from '../../services/userService'
import { Button } from '../UI'
import { getLeague, DEFAULT_ELO } from '../../utils/leagues'
import { AvatarWithBorder } from '../AvatarWithBorder'

// ─── GreetingHeader ──────────────────────────────────────────────────────────
export function GreetingHeader({ user }: { user: User | null }) {
  if (!user) return null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const league = getLeague(user.stats?.elo ?? DEFAULT_ELO)

  return (
    <div className="flex items-center gap-3 py-5 pb-2">
      <AvatarWithBorder
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        borderImageUrl={user.activeCosmetics?.borderImageUrl}
        size="md"
        glowColor={league.glowColor}
      />
      <div className="flex-1">
        <p className="text-xs text-muted">{greeting},</p>
        <h1 className="text-[22px] font-extrabold text-primary leading-tight">
          {user.displayName} <span className="inline-block animate-[wave_1.5s_ease-in-out_infinite]">👋</span>
        </h1>
      </div>
      <div className="flex items-center gap-1 bg-violet-500/10 border border-violet-500/30 rounded-full px-3 py-1.5 whitespace-nowrap">
        <span className="text-sm">⚡</span>
        <span className="text-xs font-bold text-violet-400">{user.stats?.xp ?? 0} XP</span>
      </div>
    </div>
  )
}

// ─── ActivePartyBanner ───────────────────────────────────────────────────────
export function ActivePartyBanner({ party }: { party: Party | null }) {
  const navigate = useNavigate()
  if (!party) return null

  return (
    <div 
      className="flex items-center justify-between gap-3.5 bg-gradient-to-r from-violet-500/15 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 px-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" 
      onClick={() => navigate(`/party/${party.id}`)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-success font-semibold uppercase tracking-wide">Party Activa</p>
          <p className="text-[15px] font-bold text-primary truncate">{party.name ?? party.subject?.name ?? 'Party activa'}</p>
        </div>
      </div>
      <Button size="sm" variant="primary">Ir →</Button>
    </div>
  )
}

// ─── SubjectCard ─────────────────────────────────────────────────────────────
function SubjectCard({ subject }: { subject: Subject }) {
  const navigate = useNavigate()
  const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2']
  const color = colors[subject.name.charCodeAt(0) % colors.length]

  return (
    <motion.div
      whileHover={{ scale: 1.02, x: 4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="flex items-center gap-3.5 bg-surface border border-[var(--overlay-border)] rounded-2xl p-3.5 px-4 cursor-pointer transition-[background-color] duration-200 hover:bg-elevated"
      style={{ borderLeftWidth: '3px', borderLeftColor: color }}
      onClick={() => navigate(`/subjects`)}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: color }}>
        📚
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] text-primary truncate">{subject.name}</p>
        <p className="text-xs text-muted mt-0.5">Año {subject.year}</p>
        <button
          className="text-xs text-success font-semibold flex items-center gap-1 mt-1 cursor-pointer hover:underline"
          onClick={(event) => {
            event.stopPropagation()
            navigate(`/subjects/${subject.id}/skill-tree`)
          }}
        >
          🌳 Ver habilidades
        </button>
      </div>
      <div className="text-faint text-xl font-bold shrink-0">›</div>
    </motion.div>
  )
}

export function SubjectCardGrid({ subjects }: { subjects: Subject[] }) {
  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-surface border border-[var(--overlay-border)] rounded-2xl min-h-[160px]">
        <p className="text-3xl mb-2">📖</p>
        <p className="text-content font-semibold">No tenés materias inscriptas</p>
        <p className="text-xs text-muted mt-1">Explorá el catálogo y anotate</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {subjects.map((s) => <SubjectCard key={s.id} subject={s} />)}
    </div>
  )
}

// ─── QuickActions ─────────────────────────────────────────────────────────────
export function QuickActions() {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="grid grid-cols-2 gap-3 py-2 pb-5"
    >
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center gap-2 p-[18px_12px] rounded-2xl border bg-gradient-to-br from-violet-500/10 to-blue-500/10 border-violet-500/20 hover:border-violet-500/40 text-primary font-semibold text-sm cursor-pointer shadow-lg hover:shadow-xl"
        onClick={() => navigate('/match')}
      >
        <span className="text-[26px]">🎮</span>
        <span>Find Party</span>
      </motion.button>
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center gap-2 p-[18px_12px] rounded-2xl border bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40 text-primary font-semibold text-sm cursor-pointer shadow-lg hover:shadow-xl"
        onClick={() => navigate('/subjects')}
      >
        <span className="text-[26px]">📚</span>
        <span>Materias</span>
      </motion.button>
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center gap-2 p-[18px_12px] rounded-2xl border bg-gradient-to-br from-pink-500/10 to-pink-700/10 border-[#ec4899]/25 hover:border-pink-500/40 text-primary font-semibold text-sm cursor-pointer shadow-lg hover:shadow-xl" 
        onClick={() => navigate('/parties')}
      >
        <span className="text-[26px]">👥</span>
        <span>Mis Parties</span>
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center gap-2 p-[18px_12px] rounded-2xl border bg-gradient-to-br from-green-500/10 to-emerald-700/10 border-green-500/25 hover:border-green-500/40 text-primary font-semibold text-sm cursor-pointer shadow-lg hover:shadow-xl"
        onClick={() => navigate('/friends')}
      >
        <span className="text-[26px]">🤝</span>
        <span>Amigos</span>
      </motion.button>
    </motion.div>
  )
}
