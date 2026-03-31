import { useState, useEffect } from 'react'
import type { Subject } from '../services/userService'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'

export function useUserSubjects() {
  const { user, setUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjects: Subject[] = user?.enrolledSubjects ?? []

  const refresh = async () => {
    setIsLoading(true)
    try {
      const updated = await userService.getMe()
      setUser(updated)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al cargar materias')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) refresh()
  }, [])

  return { subjects, isLoading, error, refresh }
}
