import { useCallback, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import {
  billingService,
  type BillingState,
  type PlanDescriptor,
} from '../services/billingService'

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const m = err.response?.data?.message
    if (Array.isArray(m) && m.length) return String(m[0])
    if (typeof m === 'string' && m.trim()) return m
    if (err.message) return err.message
  }
  return fallback
}

export function useBilling() {
  const [state, setState] = useState<BillingState | null>(null)
  const [plans, setPlans] = useState<PlanDescriptor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, p] = await Promise.all([
        billingService.getState(),
        billingService.getPlans(),
      ])
      setState(s)
      setPlans(p)
    } catch (err) {
      setError(messageFromError(err, 'No se pudo cargar tu plan.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const redeem = useCallback(async (code: string) => {
    const next = await billingService.redeem(code.trim())
    setState(next)
    return next
  }, [])

  return { state, plans, loading, error, recargar, redeem, messageFromError }
}
