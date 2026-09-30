import { useEffect, useState } from 'react'
import { subjectService, type CommunitySubject } from '../services/subjectService'
import { apiErrorData } from '../utils/apiErrors'

/**
 * Debounced (300ms) GET /subjects/suggest for the "Agregar materia"
 * autocomplete. `UNIVERSITY_REQUIRED` (no catalog university set) is
 * surfaced separately so the caller can show a CTA instead of an error.
 */
export function useSubjectSuggest(query: string) {
  const [results, setResults] = useState<CommunitySubject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [universityRequired, setUniversityRequired] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setUniversityRequired(false)
      setIsLoading(false)
      return
    }

    const handler = setTimeout(() => {
      setIsLoading(true)
      subjectService
        .suggest(q)
        .then((data) => {
          setResults(data)
          setUniversityRequired(false)
        })
        .catch((err) => {
          setResults([])
          setUniversityRequired(apiErrorData(err)?.code === 'UNIVERSITY_REQUIRED')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }, 300)

    return () => { clearTimeout(handler) }
  }, [query])

  return { results, isLoading, universityRequired }
}
