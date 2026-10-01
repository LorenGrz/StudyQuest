import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import {
  userService,
  type LeaderboardEntry,
  type LeaderboardFilter,
} from '../services/userService'

export type LeaderboardScope =
  | { type: 'global' }
  | { type: 'university'; universityId?: string; university?: string }
  | { type: 'career'; careerId: string }

/** Query params for a scope (GET /users/leaderboard/global and /me). */
export function leaderboardFilter(scope: LeaderboardScope): LeaderboardFilter {
  if (scope.type === 'career') return { careerId: scope.careerId }
  if (scope.type === 'university') {
    return scope.universityId
      ? { universityId: scope.universityId }
      : { university: scope.university }
  }
  return {}
}

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
 * a career). Pass `null` to skip fetching, e.g. while the "Por universidad"
 * selector still has no value. */
export function useLeaderboard(scope: LeaderboardScope | null, limit = 20) {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scope) {
      setData([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const fetchLeaderboard = async () => {
      try {
        const filter = leaderboardFilter(scope)
        const entries = Object.keys(filter).length
          ? await userService.getGlobalLeaderboard(limit, filter)
          : await userService.getGlobalLeaderboard(limit)
        if (!cancelled) setData(entries)
      } catch (err) {
        if (!cancelled) setError(messageFromError(err, 'No se pudo cargar el leaderboard'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchLeaderboard()
    return () => {
      cancelled = true
    }
  }, [scope, limit])

  return { data, loading, error }
}
