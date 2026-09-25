import { useState, useEffect } from 'react'
import { achievementService } from '../services/achievementService'
import type { Achievement, UserAchievement } from '../services/achievementService'

export interface EnrichedAchievement extends Achievement {
  unlocked: boolean
  unlockedAt: string | null
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<EnrichedAchievement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [all, mine] = await Promise.all([
          achievementService.getAll(),
          achievementService.getMyAchievements(),
        ])

        if (cancelled) return

        const unlockedMap = new Map<string, UserAchievement>()
        for (const ua of mine) {
          unlockedMap.set(ua.achievementId, ua)
        }

        const enriched: EnrichedAchievement[] = all.map((a) => {
          const ua = unlockedMap.get(a.id)
          return {
            ...a,
            unlocked: !!ua,
            unlockedAt: ua?.unlockedAt ?? null,
          }
        })

        setAchievements(enriched)
      } catch {
        if (!cancelled) setError('No se pudieron cargar los logros')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { achievements, isLoading, error }
}
