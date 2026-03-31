import { useState, useEffect, useCallback } from 'react'
import { subjectService, type SubjectQuery } from '../services/subjectService'
import { userService, type Subject } from '../services/userService'
import { useAuthStore } from '../store/authStore'

export interface SubjectFilters {
  career: string
  semester: number | null
  university?: string
}

export function useSubjectExplorer(filters: SubjectFilters, search = '') {
  const { user, setUser } = useAuthStore()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const query: SubjectQuery = { search: search || undefined }
    if (filters.career) query.career = filters.career
    if (filters.university) query.university = filters.university
    if (filters.semester != null) query.semester = filters.semester

    subjectService
      .findAll(query)
      .then((data) => { if (!cancelled) setSubjects(data) })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message ?? 'Error') })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [filters.career, filters.semester, filters.university, search])

  const enrolledIds = new Set(user?.enrolledSubjects?.map((s) => s.id) ?? [])

  const isEnrolled = (subjectId: string) => enrolledIds.has(subjectId)

  const enroll = useCallback(async (subjectId: string) => {
    await userService.enrollSubject(subjectId)
    const updated = await userService.getMe()
    setUser(updated)
  }, [setUser])

  const unenroll = useCallback(async (subjectId: string) => {
    await userService.unenrollSubject(subjectId)
    const updated = await userService.getMe()
    setUser(updated)
  }, [setUser])

  return { subjects, isLoading, error, isEnrolled, enroll, unenroll }
}
