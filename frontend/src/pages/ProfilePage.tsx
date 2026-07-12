import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  Settings,
  Pencil,
  BookOpen,
  GraduationCap,
  Library,
  LogOut,
} from "lucide-react"
import { MobileLayout } from "../components/Layouts"
import { Button, Spinner } from "../components/UI"
import { useAuthStore } from "../store/authStore"
import { useAuth } from "../hooks/useAuth"
import { userService, type UserInventory } from "../services/userService"
import { useAchievements } from "../hooks/useAchievements"
import {
  getLeague,
  DEFAULT_ELO,
  LEAGUES,
} from "../utils/leagues"
import { ProfileHeader } from "../components/profile/ProfileHeader"
import { ProfileStatsGrid } from "../components/profile/ProfileStatsGrid"
import { EditProfileModal } from "../components/profile/EditProfileModal"
import { ProfileMedals } from "../components/profile/ProfileMedals"
import { ProfileInventory } from "../components/profile/ProfileInventory"
import { PageContainer } from "../components/PagePrimitives"
import { AnimatePresence } from "framer-motion"

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [inventory, setInventory] = useState<UserInventory>({ titles: [], borders: [] })
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [isUpdatingCosmetics, setIsUpdatingCosmetics] = useState(false)
  const { achievements, isLoading: achievementsLoading } = useAchievements()

  useEffect(() => {
    Promise.all([userService.getMe(), userService.getInventory()])
      .then(([me, inv]) => {
        setUser(me)
        setInventory(inv)
        setInventoryError(null)
      })
      .catch((err) => {
        console.error(err)
        setInventoryError('No se pudo cargar el inventario')
      })
      .finally(() => setInventoryLoading(false))
  }, [setUser])

  if (!user) {
    return (
      <MobileLayout>
        <div className="flex justify-center items-center min-h-[200px]">
          <Spinner size="lg" />
        </div>
      </MobileLayout>
    )
  }

  const stats = user.stats || {
    quizzesPlayed: 0,
    quizzesWon: 0,
    currentStreak: 0,
    longestStreak: 0,
    level: 1,
    xp: 0,
    elo: DEFAULT_ELO,
  }
  const elo = stats.elo ?? DEFAULT_ELO
  const league = getLeague(elo)
  const winRate =
    stats.quizzesPlayed > 0
      ? Math.round((stats.quizzesWon / stats.quizzesPlayed) * 100)
      : 0

  const equipTitle = async (titleCode: string | null) => {
    try {
      setIsUpdatingCosmetics(true)
      const updated = await userService.setActiveCosmetics({ titleCode })
      setUser(updated)
    } catch (err) {
      console.error('No se pudo equipar título', err)
    } finally {
      setIsUpdatingCosmetics(false)
    }
  }

  const equipBorder = async (borderCode: string | null) => {
    try {
      setIsUpdatingCosmetics(true)
      const updated = await userService.setActiveCosmetics({ borderCode })
      setUser(updated)
    } catch (err) {
      console.error('No se pudo equipar borde', err)
    } finally {
      setIsUpdatingCosmetics(false)
    }
  }

  return (
    <MobileLayout>
      <PageContainer>
        <div className="pb-4 flex flex-col gap-4">
          {/* ─── Settings link ─────────────────────────────────────────── */}
          <div className="flex justify-end">
            <Link
              to="/settings"
              aria-label="Configuración"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface text-muted text-sm border border-edge min-h-[44px]"
            >
              <Settings size={14} aria-hidden="true" />
              Configuración
            </Link>
          </div>

          {/* ─── User Card — full width ─────────────────────────────────── */}
          <div>
            <ProfileHeader user={user} stats={stats} league={league} />
          </div>

          {/* ─── Main two-column area: progression + league ─────────────── */}
          <div className="flex flex-col gap-4">
        {/* Left column: stats, medals, inventory, academic info, subjects */}
        <div className="flex flex-col gap-6">

          {/* Stats Grid — 2 cols on md+ */}
          <ProfileStatsGrid elo={elo} winRate={winRate} stats={stats} leagueColor={league.color} />

          {/* Medals / Achievements */}
          <ProfileMedals achievements={achievements} loading={achievementsLoading} />

          {/* Inventory */}
          <ProfileInventory
            user={user}
            inventory={inventory}
            loading={inventoryLoading}
            error={inventoryError}
            isUpdatingCosmetics={isUpdatingCosmetics}
            equipTitle={equipTitle}
            equipBorder={equipBorder}
          />

          {/* Academic Info */}
          <section>
            <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pb-2">
              Información Académica
            </h3>
            <div className="bg-surface border border-[var(--overlay-border)] rounded-lg p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-muted flex items-center gap-1.5">
                  <Library size={14} aria-hidden="true" /> Universidad
                </span>
                <span className="text-sm font-semibold text-primary text-right">{user.university}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-muted flex items-center gap-1.5">
                  <GraduationCap size={14} aria-hidden="true" /> Carrera
                </span>
                <span className="text-sm font-semibold text-primary text-right">{user.career}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-muted flex items-center gap-1.5">
                  <BookOpen size={14} aria-hidden="true" /> Semestre
                </span>
                <span className="text-sm font-semibold text-primary text-right">{user.semester}</span>
              </div>
            </div>
          </section>

          {/* Enrolled Subjects */}
          <section>
            <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pb-2">
              Materias Inscriptas ({user.enrolledSubjects?.length || 0})
            </h3>
            <div className="flex flex-col gap-2.5">
              {user.enrolledSubjects && user.enrolledSubjects.length > 0 ? (
                user.enrolledSubjects.map((sub) => (
                  <div key={sub.id} className="bg-surface border border-[var(--overlay-border)] rounded-lg px-4 py-3 flex items-center gap-3">
                    <BookOpen size={20} className="text-accent shrink-0" aria-hidden="true" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[15px] font-semibold truncate">{sub.name}</span>
                      <span className="text-xs text-secondary">{sub.code}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 px-5">
                  <p className="text-sm font-semibold text-primary">
                    No estás inscripto en ninguna materia
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* League Ladder */}
        <aside>
          <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pb-2 mt-6 lg:mt-0">
            Ligas
          </h3>
          <div className="flex flex-col gap-1.5">
            {[...LEAGUES].reverse().map((l) => (
              <div
                key={l.tier}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-[var(--overlay-border)] bg-surface transition-all duration-200 overflow-hidden ${l.tier === league.tier ? "border-2 translate-x-1" : ""}`}
                style={
                  l.tier === league.tier
                    ? { borderColor: l.color, background: `${l.glowColor}` }
                    : {}
                }
              >
                <span className="text-xl shrink-0">{l.icon}</span>
                <span
                  className="flex-1 text-sm font-semibold truncate"
                  style={
                    l.tier === league.tier
                      ? { color: l.color, fontWeight: 700 }
                      : {}
                  }
                >
                  {l.name}
                </span>
                <span className="text-xs text-muted shrink-0">
                  {l.maxElo === Infinity
                    ? `${l.minElo}+`
                    : `${l.minElo}–${l.maxElo}`}
                </span>
                {l.tier === league.tier && (
                  <span className="text-[11px] font-bold text-on-accent bg-accent rounded-full px-2 py-0.5 shrink-0">● Tú</span>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Account — placed after Ligas so it sits at the bottom of the profile */}
        <section className="mb-4">
          <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pb-2">
            Cuenta
          </h3>
          <div className="bg-surface border border-[var(--overlay-border)] rounded-xl p-4 flex flex-col gap-3.5">
            <Button
              variant="secondary"
              onClick={() => setIsEditing(true)}
              className="w-full"
              size="lg"
            >
              <Pencil size={14} aria-hidden="true" className="mr-1" /> Editar Perfil
            </Button>

            <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-lg border border-danger/20 bg-danger/5">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-bold text-danger">Cerrar sesión</span>
                <span className="text-[13px] leading-[1.4] text-secondary">
                  Salí de tu cuenta en este dispositivo cuando quieras.
                </span>
              </div>
              <Button
                variant="danger"
                onClick={logout}
                className="shrink-0 min-w-24"
                size="md"
              >
                <LogOut size={14} aria-hidden="true" className="mr-1" /> Salir
              </Button>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {isEditing && (
          <EditProfileModal
            user={user}
            onClose={() => setIsEditing(false)}
            onUpdate={setUser}
          />
        )}
      </AnimatePresence>
        </div>
      </PageContainer>
    </MobileLayout>
  )
}


