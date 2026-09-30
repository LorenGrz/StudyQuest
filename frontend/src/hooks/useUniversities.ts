import { useState, useEffect } from 'react'
import { subjectService } from '../services/subjectService'
import { universityService, type University, type Career } from '../services/universityService'
import { groupCareersByFaculty, type CareerGroup } from '../utils/careers'

export function useUniversities(search = '') {
  const [universities, setUniversities] = useState<University[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    universityService
      .getUniversities(search || undefined)
      .then((data) => { if (!cancelled) setUniversities(data) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [search])

  return { universities, isLoading }
}

/**
 * Active careers of one university (register/profile pickers), grouped by
 * faculty. `undefined` while no university is chosen yet.
 */
export function useUniversityCareers(universityId: string | undefined) {
  const [careers, setCareers] = useState<Career[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!universityId) {
      setCareers([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    universityService
      .getCareers(universityId)
      .then((data) => { if (!cancelled) setCareers(data) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [universityId])

  const groups: CareerGroup[] = groupCareersByFaculty(careers)

  return { careers, groups, isLoading }
}

// Lista cerrada de carreras (GET /subjects/careers, deprecated): la sigue
// usando SubjectExplorerPage; W1 solo saca el registro/perfil de ahí.
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
