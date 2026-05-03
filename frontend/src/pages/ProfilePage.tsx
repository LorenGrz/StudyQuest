import { useState, useEffect } from 'react'
import { MobileLayout } from '../components/Layouts'
import { Button, Badge, Spinner } from '../components/UI'
import { useAuthStore } from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import { userService } from '../services/userService'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

  // Fetch latest data on mount
  useEffect(() => {
    userService.getMe().then(setUser).catch(console.error)
  }, [setUser])

  if (!user) {
    return (
      <MobileLayout>
        <div className="center-spinner"><Spinner size="lg" /></div>
      </MobileLayout>
    )
  }

  const stats = user.stats || { quizzesPlayed: 0, quizzesWon: 0, currentStreak: 0, longestStreak: 0, level: 1, xp: 0 }
  const winRate = stats.quizzesPlayed > 0 
    ? Math.round((stats.quizzesWon / stats.quizzesPlayed) * 100) 
    : 0

  return (
    <MobileLayout>
      <div className="profile-header">
        <h1 className="page-title">Mi Perfil</h1>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          ✏️ Editar
        </Button>
      </div>
      
      {/* User Card */}
      <div className="profile-card">
        <div className="avatar-placeholder" style={{ width: '64px', height: '64px', fontSize: '28px', flexShrink: 0 }}>
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="profile-card-info">
          <h2>{user.displayName}</h2>
          <p>@{user.username}</p>
          <div className="profile-badges">
            <Badge variant="primary">Nivel {stats.level}</Badge>
            <Badge variant="success">⚡ {stats.xp} XP</Badge>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <h3 className="section-title" style={{ marginTop: '16px' }}>Estadísticas</h3>
      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-value">{stats.quizzesPlayed}</span>
          <span className="stat-label">Quests Jugadas</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{winRate}%</span>
          <span className="stat-label">Win Rate</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">🔥 {stats.currentStreak}</span>
          <span className="stat-label">Racha Actual</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">🏆 {stats.longestStreak}</span>
          <span className="stat-label">Mejor Racha</span>
        </div>
      </div>

      {/* Academic Info */}
      <h3 className="section-title" style={{ marginTop: '16px' }}>Información Académica</h3>
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

      {/* Enrolled Subjects */}
      <h3 className="section-title" style={{ marginTop: '16px' }}>Materias Inscriptas ({user.enrolledSubjects?.length || 0})</h3>
      <div className="enrolled-subjects-list">
        {user.enrolledSubjects && user.enrolledSubjects.length > 0 ? (
          user.enrolledSubjects.map(sub => (
            <div key={sub.id} className="enrolled-subject-item">
              <span className="enrolled-subject-icon">📘</span>
              <div className="enrolled-subject-info">
                <span className="enrolled-subject-name">{sub.name}</span>
                <span className="enrolled-subject-code">{sub.code}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: '20px' }}>
            <p className="empty-text" style={{ fontSize: '14px' }}>No estás inscripto en ninguna materia</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '32px' }}>
        <Button variant="danger" onClick={logout} className="w-full" size="lg">
          Cerrar Sesión
        </Button>
      </div>

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
    semester: user.semester
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const updatedUser = await userService.updateMe({
        ...formData,
        semester: Number(formData.semester)
      })
      onUpdate(updatedUser)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al actualizar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="invite-overlay" onClick={onClose}>
      <div className="invite-sheet" onClick={e => e.stopPropagation()}>
        <div className="invite-sheet-handle" />
        <h2 className="invite-title">Editar Perfil</h2>
        
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '16px' }}>
          <div className="input-group">
            <label className="input-label">Nombre Completo</label>
            <input 
              className="input"
              value={formData.displayName}
              onChange={e => setFormData({...formData, displayName: e.target.value})}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Universidad</label>
            <input 
              className="input"
              value={formData.university}
              onChange={e => setFormData({...formData, university: e.target.value})}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Carrera</label>
            <input 
              className="input"
              value={formData.career}
              onChange={e => setFormData({...formData, career: e.target.value})}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Semestre / Año</label>
            <input 
              type="number"
              className="input"
              value={formData.semester}
              onChange={e => setFormData({...formData, semester: e.target.value})}
              min="1"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
