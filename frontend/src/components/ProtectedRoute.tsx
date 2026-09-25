import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAchievementNotifier } from '../hooks/useAchievementNotifier'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated } = useAuthStore()
  useAchievementNotifier()
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  return <>{children}</>
}
