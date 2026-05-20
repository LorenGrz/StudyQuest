import { useState, useEffect } from "react"
import { MobileLayout } from "../components/Layouts"
import { Button, Badge, Spinner } from "../components/UI"
import { useAuthStore } from "../store/authStore"
import { useAuth } from "../hooks/useAuth"
import { userService } from "../services/userService"
import {
  getLeague,
  getEloProgress,
  DEFAULT_ELO,
  LEAGUES,
} from "../utils/leagues"
import { useAchievements } from "../hooks/useAchievements"

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const { achievements, isLoading: achievementsLoading } = useAchievements()

  useEffect(() => {
    userService.getMe().then(setUser).catch(console.error)
  }, [setUser])

  if (!user) {
    return (
      <MobileLayout>
        <div className="center-spinner">
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
  const progress = getEloProgress(elo)
  const winRate =
    stats.quizzesPlayed > 0
      ? Math.round((stats.quizzesWon / stats.quizzesPlayed) * 100)
      : 0

  return (
    <MobileLayout>
      {/* ─── User Card ─────────────────────────────────────────────── */}
      <div
        className="profile-card"
        style={{ marginTop: "16px", borderTop: `3px solid ${league.color}` }}
      >
        <div
          className="avatar-placeholder"
          style={{
            width: "64px",
            height: "64px",
            fontSize: "28px",
            flexShrink: 0,
            boxShadow: `0 0 16px ${league.glowColor}`,
          }}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="profile-card-info">
          <h2>{user.displayName}</h2>
          <p>@{user.username}</p>
          <div className="profile-badges">
            <Badge variant="primary">Nivel {stats.level}</Badge>
            <Badge variant="success">⚡ {stats.xp} XP</Badge>
            <span
              className="league-pill"
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
      <h3 className="section-title" style={{ marginTop: "16px" }}>
        Estadísticas
      </h3>
      <div className="stats-grid">
        <div
          className="stat-box stat-box--elo"
          style={{ borderColor: league.color }}
        >
          <span className="stat-value" style={{ color: league.color }}>
            {elo}
          </span>
          <span className="stat-label">ELO</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{winRate}%</span>
          <span className="stat-label">Win Rate</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{stats.quizzesPlayed}</span>
          <span className="stat-label">Quests</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">🔥 {stats.currentStreak}</span>
          <span className="stat-label">Racha</span>
        </div>
      </div>

      {/* ─── Medals / Achievements ──────────────────────────────────── */}
      <h3 className="section-title" style={{ marginTop: "16px" }}>
        Medallas
      </h3>
      {achievementsLoading ? (
        <div className="center-spinner" style={{ padding: "20px" }}>
          <Spinner size="sm" />
        </div>
      ) : achievements.length === 0 ? (
        <div className="empty-state" style={{ padding: "20px" }}>
          <p className="empty-text" style={{ fontSize: "14px" }}>
            No hay logros disponibles aún
          </p>
        </div>
      ) : (
        <div className="achievements-grid">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`achievement-item ${a.unlocked ? "achievement-item--unlocked" : "achievement-item--locked"}`}
              title={
                a.unlocked
                  ? `${a.name} — ${a.description}`
                  : `🔒 ${a.name} — ${a.description}`
              }
            >
              <span className="achievement-icon">{a.icon}</span>
              <span className="achievement-name">{a.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── League Ladder ─────────────────────────────────────────── */}
      <h3 className="section-title" style={{ marginTop: "16px" }}>
        Ligas
      </h3>
      <div className="league-ladder">
        {[...LEAGUES].reverse().map((l) => (
          <div
            key={l.tier}
            className={`league-ladder-row ${l.tier === league.tier ? "league-ladder-row--active" : ""}`}
            style={
              l.tier === league.tier
                ? { borderColor: l.color, background: `${l.glowColor}` }
                : {}
            }
          >
            <span className="league-ladder-icon">{l.icon}</span>
            <span
              className="league-ladder-name"
              style={
                l.tier === league.tier
                  ? { color: l.color, fontWeight: 700 }
                  : {}
              }
            >
              {l.name}
            </span>
            <span className="league-ladder-range">
              {l.maxElo === Infinity
                ? `${l.minElo}+`
                : `${l.minElo}–${l.maxElo}`}
            </span>
            {l.tier === league.tier && (
              <span className="league-ladder-badge">● Tú</span>
            )}
          </div>
        ))}
      </div>

      {/* ─── Academic Info ─────────────────────────────────────────── */}
      <h3 className="section-title" style={{ marginTop: "16px" }}>
        Información Académica
      </h3>
      <div className="academic-card">
        <div className="academic-row">
          <span className="academic-label">🏫 Universidad</span>
          <span className="academic-value">{user.university}</span>
        </div>
        <div className="academic-row">
          <span className="academic-label">🎓 Carrera</span>
          <span className="academic-value">{user.career}</span>
        </div>
        <div className="academic-row">
          <span className="academic-label">📚 Semestre</span>
          <span className="academic-value">{user.semester}</span>
        </div>
      </div>

      {/* ─── Enrolled Subjects ─────────────────────────────────────── */}
      <h3 className="section-title" style={{ marginTop: "16px" }}>
        Materias Inscriptas ({user.enrolledSubjects?.length || 0})
      </h3>
      <div className="enrolled-subjects-list">
        {user.enrolledSubjects && user.enrolledSubjects.length > 0 ? (
          user.enrolledSubjects.map((sub) => (
            <div key={sub.id} className="enrolled-subject-item">
              <span className="enrolled-subject-icon">📘</span>
              <div className="enrolled-subject-info">
                <span className="enrolled-subject-name">{sub.name}</span>
                <span className="enrolled-subject-code">{sub.code}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: "20px" }}>
            <p className="empty-text" style={{ fontSize: "14px" }}>
              No estás inscripto en ninguna materia
            </p>
          </div>
        )}
      </div>

      <h3 className="section-title" style={{ marginTop: "24px" }}>
        Cuenta
      </h3>
      <div className="profile-actions-card">
        <Button
          variant="secondary"
          onClick={() => setIsEditing(true)}
          className="w-full"
          size="lg"
        >
          ✏️ Editar Perfil
        </Button>

        <div className="profile-logout-panel">
          <div className="profile-logout-copy">
            <span className="profile-logout-title">Cerrar sesión</span>
            <span className="profile-logout-text">
              Salí de tu cuenta en este dispositivo cuando quieras.
            </span>
          </div>
          <Button
            variant="danger"
            onClick={logout}
            className="profile-logout-button"
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
    <div className="invite-overlay" onClick={onClose}>
      <div className="invite-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="invite-sheet-handle" />
        <h2 className="invite-title">Editar Perfil</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
          style={{ marginTop: "16px" }}
        >
          <div className="input-group">
            <label className="input-label">Nombre Completo</label>
            <input
              className="input"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Universidad</label>
            <input
              className="input"
              value={formData.university}
              onChange={(e) =>
                setFormData({ ...formData, university: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Carrera</label>
            <input
              className="input"
              value={formData.career}
              onChange={(e) =>
                setFormData({ ...formData, career: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Semestre / Año</label>
            <input
              type="number"
              className="input"
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
