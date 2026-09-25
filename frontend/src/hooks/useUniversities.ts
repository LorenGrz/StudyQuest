import { useState, useEffect } from 'react'
import { subjectService } from '../services/subjectService'

export function useUniversities(search = '') {
  const [universities, setUniversities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    subjectService
      .getUniversities(search || undefined)
      .then((data) => { if (!cancelled) setUniversities(data) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [search])

  return { universities, isLoading }
}

// Lista cerrada de carreras (GET /subjects/careers devuelve la constante CAREERS).
export function useCareers() {
  const [careers, setCareers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    subjectService
      .getCareers()
      .then((data) => { if (!cancelled) setCareers(data) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { careers, isLoading }
}
