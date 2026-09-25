import { useEffect, useState, useCallback } from 'react'
import { userService, type DashboardStats } from '../services/userService'

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await userService.getDashboardStats()
      setStats(data)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al cargar estadísticas')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { stats, isLoading, error, refresh }
}
