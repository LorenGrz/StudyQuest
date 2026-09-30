import { useCallback, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import {
  adminService,
  type AdminCareerRequest,
  type ApproveCareerRequestPayload,
  type CareerRequestStatus,
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

/** GET /admin/career-requests + approve/reject (W3, admin panel). */
export function useAdminCareerRequests(status: CareerRequestStatus = 'pending') {
  const [requests, setRequests] = useState<AdminCareerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRequests(await adminService.getCareerRequests(status))
    } catch (err) {
      setError(messageFromError(err, 'No se pudieron cargar los pedidos de carrera.'))
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const approve = useCallback(
    async (id: string, payload: ApproveCareerRequestPayload) => {
      await adminService.approveCareerRequest(id, payload)
      await recargar()
    },
    [recargar],
  )

  const reject = useCallback(
    async (id: string, adminNote?: string) => {
      await adminService.rejectCareerRequest(id, adminNote)
      await recargar()
    },
    [recargar],
  )

  return { requests, loading, error, recargar, approve, reject, messageFromError }
}
