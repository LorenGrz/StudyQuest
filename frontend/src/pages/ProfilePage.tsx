import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { MobileLayout } from "../components/Layouts"
import { Button, Badge, Spinner } from "../components/UI"
import { AvatarWithBorder } from "../components/AvatarWithBorder"
import { useAuthStore } from "../store/authStore"
import { useAuth } from "../hooks/useAuth"
import { userService, type UserInventory } from "../services/userService"
import {
  getLeague,
  DEFAULT_ELO,
  LEAGUES,
} from "../utils/leagues"
import { useAchievements } from "../hooks/useAchievements"

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
      <div className="flex justify-end mt-4">
        <Link
          to="/settings"
          aria-label="Configuración"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface text-muted text-sm border border-edge"
        >
          ⚙️ Configuración
        </Link>
      </div>

      {/* ─── User Card ─────────────────────────────────────────────── */}
      <div
        className="bg-surface border border-white/8 rounded-[24px] p-6 mx-4 flex gap-4 items-center"
        style={{ marginTop: "16px", borderTop: `3px solid ${league.color}` }}
      >
        <AvatarWithBorder
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          borderImageUrl={user.activeCosmetics?.borderImageUrl}
          size="lg"
          glowColor={league.glowColor}
        />
        <div className="flex flex-col gap-1">
          <h2>{user.displayName}</h2>
          <p>@{user.username}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="primary">Nivel {stats.level}</Badge>
            <Badge variant="success">⚡ {stats.xp} XP</Badge>
            <span
              className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-bold text-white text-shadow-[0_1px_3px_rgba(0,0,0,0.4)] tracking-[0.3px] relative z-[1]"
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

      {/* ─── Stats Grid ────────────────────────────────────────────── */}
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pt-4 pb-1" style={{ marginTop: "16px" }}>
        Estadísticas
      </h3>
      <div className="grid grid-cols-2 gap-3 px-4">
        <div
          className="bg-surface border border-white/8 rounded-[18px] p-4 flex flex-col items-center justify-center text-center border-2 bg-black/20"
          style={{ borderColor: league.color }}
        >
          <span className="text-2xl font-extrabold text-accent-light" style={{ color: league.color }}>
            {elo}
          </span>
          <span className="text-xs text-muted mt-1">ELO</span>
        </div>
        <div className="bg-surface border border-white/8 rounded-[18px] p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-accent-light">{winRate}%</span>
          <span className="text-xs text-muted mt-1">Win Rate</span>
        </div>
        <div className="bg-surface border border-white/8 rounded-[18px] p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-accent-light">{stats.quizzesPlayed}</span>
          <span className="text-xs text-muted mt-1">Quests</span>
        </div>
        <div className="bg-surface border border-white/8 rounded-[18px] p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-accent-light">🔥 {stats.currentStreak}</span>
          <span className="text-xs text-muted mt-1">Racha</span>
        </div>
      </div>

      {/* ─── Medals / Achievements ──────────────────────────────────── */}
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pt-4 pb-1" style={{ marginTop: "16px" }}>
        Medallas
      </h3>
      {achievementsLoading ? (
        <div className="flex justify-center items-center min-h-[200px]" style={{ padding: "20px" }}>
          <Spinner size="sm" />
        </div>
      ) : achievements.length === 0 ? (
        <div className="text-center py-10 px-5" style={{ padding: "20px" }}>
          <p className="text-lg font-semibold text-primary" style={{ fontSize: "14px" }}>
            No hay logros disponibles aún
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2.5 px-4">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-[18px] border border-white/8 bg-surface text-center transition-all duration-[250ms] ease cursor-default ${a.unlocked ? "border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.06)] shadow-[0_0_12px_rgba(124,58,237,0.15)] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(124,58,237,0.25)]" : "opacity-35 grayscale-[0.8]"}`}
              title={
                a.unlocked
                  ? `${a.name} — ${a.description}`
                  : `🔒 ${a.name} — ${a.description}`
              }
            >
              <span className="text-[28px] leading-none">{a.icon}</span>
              <span className="text-[11px] font-semibold text-secondary leading-[1.3] overflow-hidden text-ellipsis line-clamp-2">{a.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Inventario de cosméticos ─────────────────────────────── */}
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pt-4 pb-1" style={{ marginTop: '16px' }}>Inventario</h3>
      {inventoryLoading ? (
        <div className="flex justify-center items-center min-h-[200px]" style={{ padding: '20px' }}><Spinner size="sm" /></div>
      ) : inventoryError ? (
        <div className="text-center py-10 px-5" style={{ padding: '20px' }}>
          <p className="text-lg font-semibold text-primary" style={{ fontSize: '14px' }}>{inventoryError}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5" style={{ marginTop: '8px' }}>
            <p className="text-[13px] font-medium text-secondary" style={{ marginBottom: '8px' }}>Títulos</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => equipTitle(null)}
                disabled={isUpdatingCosmetics}
                style={{ 
                  padding: '12px 16px',
                  borderRadius: '12px',
                  borderColor: user.activeCosmetics?.titleCode ? 'var(--border)' : 'var(--accent)',
                  background: user.activeCosmetics?.titleCode ? 'var(--bg-surface)' : 'rgba(99, 102, 241, 0.1)'
                }}
              >
                Sin título
              </button>
              {inventory.titles.map((title) => (
                <button
                  key={title.code}
                  className="btn btn-secondary"
                  onClick={() => equipTitle(title.code)}
                  disabled={isUpdatingCosmetics}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    borderColor: user.activeCosmetics?.titleCode === title.code ? 'var(--accent)' : 'var(--border)',
                    background: user.activeCosmetics?.titleCode === title.code ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
                  }}
                >
                  {title.text}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5" style={{ marginTop: '24px' }}>
            <p className="text-[13px] font-medium text-secondary" style={{ marginBottom: '8px' }}>Bordes</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4 mt-3">
              <div
                className={`flex flex-col items-center gap-2 px-2 py-3 border-2 border-white/8 rounded-[18px] bg-transparent cursor-pointer transition-all duration-200 hover:border-accent hover:bg-white/[0.05] ${!user.activeCosmetics?.borderCode ? 'border-accent bg-[rgba(99,102,241,0.1)] shadow-[0_0_16px_rgba(99,102,241,0.2)]' : ''}`}
                onClick={() => equipBorder(null)}
                style={{ opacity: isUpdatingCosmetics ? 0.5 : 1 }}
              >
                <div className="w-11 h-11 rounded-full bg-transparent relative flex items-center justify-center">
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>{user.displayName.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-xs font-medium text-secondary text-center">Sin borde</span>
              </div>
              {inventory.borders?.map((border) => (
                <div
                  key={border.code}
                  className={`flex flex-col items-center gap-2 px-2 py-3 border-2 border-white/8 rounded-[18px] bg-transparent cursor-pointer transition-all duration-200 hover:border-accent hover:bg-white/[0.05] ${user.activeCosmetics?.borderCode === border.code ? 'border-accent bg-[rgba(99,102,241,0.1)] shadow-[0_0_16px_rgba(99,102,241,0.2)]' : ''}`}
                  onClick={() => equipBorder(border.code)}
                  style={{ opacity: isUpdatingCosmetics ? 0.5 : 1 }}
                >
                  <div className="w-11 h-11 rounded-full bg-transparent relative flex items-center justify-center">
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>{user.displayName.charAt(0).toUpperCase()}</span>
                    <img src={`http://localhost:3000${border.imageUrl}`} alt="" className="absolute w-16 h-16 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="text-xs font-medium text-secondary text-center">{border.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── League Ladder ─────────────────────────────────────────── */}
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pt-4 pb-1" style={{ marginTop: "16px" }}>
        Ligas
      </h3>
      <div className="flex flex-col gap-1.5 px-4">
        {[...LEAGUES].reverse().map((l) => (
          <div
            key={l.tier}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[18px] border border-white/8 bg-surface transition-all duration-200 ${l.tier === league.tier ? "border-2 translate-x-1" : ""}`}
            style={
              l.tier === league.tier
                ? { borderColor: l.color, background: `${l.glowColor}` }
                : {}
            }
          >
            <span className="text-xl">{l.icon}</span>
            <span
              className="flex-1 text-sm font-semibold"
              style={
                l.tier === league.tier
                  ? { color: l.color, fontWeight: 700 }
                  : {}
              }
            >
              {l.name}
            </span>
            <span className="text-xs text-muted">
              {l.maxElo === Infinity
                ? `${l.minElo}+`
                : `${l.minElo}–${l.maxElo}`}
            </span>
            {l.tier === league.tier && (
              <span className="text-[11px] font-bold text-white bg-accent rounded-full px-2 py-0.5">● Tú</span>
            )}
          </div>
        ))}
      </div>

      {/* ─── Academic Info ─────────────────────────────────────────── */}
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pt-4 pb-1" style={{ marginTop: "16px" }}>
        Información Académica
      </h3>
      <div className="bg-surface border border-white/8 rounded-[18px] p-4 mx-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted">🏫 Universidad</span>
          <span className="text-sm font-semibold text-primary text-right">{user.university}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted">🎓 Carrera</span>
          <span className="text-sm font-semibold text-primary text-right">{user.career}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted">📚 Semestre</span>
          <span className="text-sm font-semibold text-primary text-right">{user.semester}</span>
        </div>
      </div>

      {/* ─── Enrolled Subjects ─────────────────────────────────────── */}
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pt-4 pb-1" style={{ marginTop: "16px" }}>
        Materias Inscriptas ({user.enrolledSubjects?.length || 0})
      </h3>
      <div className="flex flex-col gap-2.5 px-4">
        {user.enrolledSubjects && user.enrolledSubjects.length > 0 ? (
          user.enrolledSubjects.map((sub) => (
            <div key={sub.id} className="bg-surface border border-white/8 rounded-[18px] px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">📘</span>
              <div className="flex flex-col flex-1">
                <span className="text-[15px] font-semibold">{sub.name}</span>
                <span className="text-xs text-secondary">{sub.code}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 px-5" style={{ padding: "20px" }}>
            <p className="text-lg font-semibold text-primary" style={{ fontSize: "14px" }}>
              No estás inscripto en ninguna materia
            </p>
          </div>
        )}
      </div>

      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pt-4 pb-1" style={{ marginTop: "24px" }}>
        Cuenta
      </h3>
      <div className="bg-surface border border-white/8 rounded-[24px] mx-4 mb-[108px] p-4 flex flex-col gap-3.5">
        <Button
          variant="secondary"
          onClick={() => setIsEditing(true)}
          className="w-full"
          size="lg"
        >
          ✏️ Editar Perfil
        </Button>

        <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-[18px] border border-[rgba(239,68,68,0.18)] bg-gradient-to-b from-[rgba(127,29,29,0.18)] to-[rgba(12,12,22,0.35)]">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-bold text-[#f5c2c7]">Cerrar sesión</span>
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
            Salir
          </Button>
        </div>
      </div>
      <div aria-hidden="true" style={{ height: "20px", flexShrink: 0 }} />

      {isEditing && (
        <EditProfileModal
          user={user}
          onClose={() => setIsEditing(false)}
          onUpdate={setUser}
        />
      )}
    </MobileLayout>
  )
}

function EditProfileModal({ user, onClose, onUpdate }: any) {
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    university: user.university,
    career: user.career,
    semester: user.semester,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const updatedUser = await userService.updateMe({
        ...formData,
        semester: Number(formData.semester),
      })
      onUpdate(updatedUser)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al actualizar perfil")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[300] flex items-end backdrop-blur-[4px] animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-[480px] mx-auto bg-elevated border-t border-white/8 rounded-t-[24px] pt-6 px-5 pb-9 flex flex-col gap-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="w-9 h-1 rounded-sm bg-white/[0.15] mx-auto -mb-2" />
        <h2 className="text-lg font-extrabold">Editar Perfil</h2>

        {error && <div className="px-4 py-3 rounded-[12px] text-sm bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.2)]">{error}</div>}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          style={{ marginTop: "16px" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary">Nombre Completo</label>
            <input
              className="w-full px-3.5 py-3 bg-panel border border-white/8 rounded-[12px] text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)]"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary">Universidad</label>
            <input
              className="w-full px-3.5 py-3 bg-panel border border-white/8 rounded-[12px] text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)]"
              value={formData.university}
              onChange={(e) =>
                setFormData({ ...formData, university: e.target.value })
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary">Carrera</label>
            <input
              className="w-full px-3.5 py-3 bg-panel border border-white/8 rounded-[12px] text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)]"
              value={formData.career}
              onChange={(e) =>
                setFormData({ ...formData, career: e.target.value })
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary">Semestre / Año</label>
            <input
              type="number"
              className="w-full px-3.5 py-3 bg-panel border border-white/8 rounded-[12px] text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)]"
              value={formData.semester}
              onChange={(e) =>
                setFormData({ ...formData, semester: e.target.value })
              }
              min="1"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isLoading}
            >
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
