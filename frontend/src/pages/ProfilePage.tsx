import { MobileLayout } from '../components/Layouts'
import { Button, Badge } from '../components/UI'
import { useAuthStore } from '../store/authStore'
import { useAuth } from '../hooks/useAuth'

const ProfilePage = () => {
  const { user } = useAuthStore()
  const { logout } = useAuth()

  return (
    <MobileLayout>
      <h1 className="page-title" style={{ marginTop: '10px' }}>Mi Perfil</h1>
      
      {user && (
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', textAlign: 'center', marginTop: '16px' }}>
          <div className="avatar-placeholder" style={{ margin: '0 auto 16px', width: '80px', height: '80px', fontSize: '32px' }}>
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>{user.displayName}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>@{user.username}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <Badge variant="primary">Nivel {user.stats?.level ?? 1}</Badge>
            <Badge variant="success">{user.stats?.xp ?? 0} XP</Badge>
          </div>
        </div>
      )}

      <div style={{ marginTop: '32px' }}>
        <Button variant="danger" onClick={logout} className="w-full" size="lg">
          Cerrar Sesión
        </Button>
      </div>
    </MobileLayout>
  )
}

export default ProfilePage
