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

export function useCareers(university: string) {
  const [careers, setCareers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!university) { setCareers([]); return }
    let cancelled = false
    setIsLoading(true)
    subjectService
      .getCareers(university)
      .then((data) => { if (!cancelled) setCareers(data) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [university])

  return { careers, isLoading }
}
