import { useCallback, useEffect, useState } from 'react'
import { userService, type RecommendedQuestDto } from '../services/userService'

const PAGE_SIZE = 5

export function useRecommendedQuests() {
  const [items, setItems] = useState<RecommendedQuestDto[]>([])
  const [page, setPageState] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Every setState lives inside `.then`/`.catch`/`.finally` so the mount +
  // page-change effect below never calls setState synchronously.
  const load = useCallback((pageToLoad: number) => {
    return userService
      .getRecommendedQuests(pageToLoad, PAGE_SIZE)
      .then((result) => {
        setItems(result.items)
        setTotalPages(result.totalPages)
        setTotal(result.total)
        setError(null)
      })
      .catch(() => {
        setError('No pudimos cargar las recomendaciones.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load(page)
  }, [page, load])

  // Wraps the raw setter so page navigation (an event-handler call, not an
  // effect) shows loading immediately instead of waiting for the effect.
  const setPage = useCallback((updater: number | ((prev: number) => number)) => {
    setLoading(true)
    setPageState(updater)
  }, [])

  // Reloads the CURRENT page (fixes the old "Reintentar" bug that reset to page 1).
  const recargar = useCallback(() => {
    setLoading(true)
    return load(page)
  }, [load, page])

  return { items, page, setPage, totalPages, total, loading, error, recargar }
}
