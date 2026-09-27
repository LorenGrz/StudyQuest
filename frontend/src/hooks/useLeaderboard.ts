import { useCallback, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { userService, type LeaderboardEntry } from '../services/userService'

export type LeaderboardScope =
  | { type: 'global' }
  | { type: 'university'; university: string }
  | { type: 'subject'; subjectId: string }

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const m = err.response?.data?.message
    if (Array.isArray(m) && m.length) return String(m[0])
    if (typeof m === 'string' && m.trim()) return m
    if (err.message) return err.message
  }
  return fallback
}

/** Loads the leaderboard entries for a given scope (global / a university /
 * a subject). Pass `null` to skip fetching, e.g. while the "Por universidad"
 * selector still has no value. */
export function useLeaderboard(scope: LeaderboardScope | null, limit = 20) {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    if (!scope) {
      setData([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const entries =
        scope.type === 'subject'
          ? await userService.getLeaderboard(scope.subjectId, limit)
          : scope.type === 'university'
            ? await userService.getGlobalLeaderboard(limit, scope.university)
            : await userService.getGlobalLeaderboard(limit)
      setData(entries)
    } catch (err) {
      setError(messageFromError(err, 'No se pudo cargar el leaderboard'))
    } finally {
      setLoading(false)
    }
  }, [scope, limit])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { data, loading, error, recargar }
}
