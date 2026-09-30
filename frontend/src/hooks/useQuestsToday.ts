import { useCallback, useEffect, useState } from 'react'
import { userService, type RecommendedQuestDto } from '../services/userService'

export function useQuestsToday() {
  const [data, setData] = useState<RecommendedQuestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // No direct setState before the request settles: the loading indicator
  // starts `true` via the initial state instead, so this stays a plain
  // async load with every setState tucked inside a `.then`/`.catch`/`.finally`.
  const load = useCallback(() => {
    return userService
      .getQuestsToday()
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch(() => {
        setError('No pudimos cargar tus quests de hoy.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const recargar = useCallback(() => {
    setLoading(true)
    return load()
  }, [load])

  return { data, loading, error, recargar }
}
