import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '../store/authStore'
import type { User } from '../services/userService'

vi.mock('../hooks/useAchievementNotifier', () => ({
  useAchievementNotifier: vi.fn(),
}))

/** Only `role` matters to ProtectedRoute; the rest of User is irrelevant here. */
const userWithRole = (role: User['role']) => ({ role }) as unknown as User

function renderAt(path: string, adminOnly = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={adminOnly}>
              <div>Admin content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/auth" element={<div>Auth</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
  })

  it('redirects to /auth when not authenticated', () => {
    renderAt('/admin', true)
    expect(screen.getByText('Auth')).toBeInTheDocument()
  })

  it('redirects a non-admin user to /dashboard on an adminOnly route', () => {
    useAuthStore.setState({
      user: userWithRole('USER'),
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    })
    renderAt('/admin', true)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('lets an ADMIN user through', () => {
    useAuthStore.setState({
      user: userWithRole('ADMIN'),
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    })
    renderAt('/admin', true)
    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  it('does not gate a non-adminOnly route by role', () => {
    useAuthStore.setState({
      user: userWithRole('USER'),
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    })
    renderAt('/admin', false)
    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })
})
