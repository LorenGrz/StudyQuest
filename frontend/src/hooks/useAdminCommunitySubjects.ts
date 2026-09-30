import { useCallback, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import {
  adminService,
  type AdminCommunitySubject,
  type AdminCommunitySubjectTab,
} from '../services/adminService'

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const m = err.response?.data?.message
    if (Array.isArray(m) && m.length) return String(m[0])
    if (typeof m === 'string' && m.trim()) return m
    if (err.message) return err.message
  }
  return fallback
}

/** GET /admin/community-subjects + moderation actions (W3, admin panel). */
export function useAdminCommunitySubjects(tab: AdminCommunitySubjectTab) {
  const [subjects, setSubjects] = useState<AdminCommunitySubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSubjects(await adminService.getCommunitySubjects(tab))
    } catch (err) {
      setError(messageFromError(err, 'No se pudieron cargar las materias.'))
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const publish = useCallback(
    async (id: string) => {
      await adminService.publishSubject(id)
      await recargar()
    },
    [recargar],
  )

  const hide = useCallback(
    async (id: string) => {
      await adminService.hideSubject(id)
      await recargar()
    },
    [recargar],
  )

  const unhide = useCallback(
    async (id: string) => {
      await adminService.unhideSubject(id)
      await recargar()
    },
    [recargar],
  )

  const rename = useCallback(
    async (id: string, name: string) => {
      await adminService.renameSubject(id, name)
      await recargar()
    },
    [recargar],
  )

  const merge = useCallback(
    async (fromId: string, toId: string) => {
      await adminService.mergeSubjects(fromId, toId)
      await recargar()
    },
    [recargar],
  )

  return { subjects, loading, error, recargar, publish, hide, unhide, rename, merge, messageFromError }
}
