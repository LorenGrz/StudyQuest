import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAchievementNotifier } from '../hooks/useAchievementNotifier'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Redirects non-ADMIN users to /dashboard instead of just requiring login. */
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly }: Props) {
  const { isAuthenticated, user } = useAuthStore()
  useAchievementNotifier()
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
