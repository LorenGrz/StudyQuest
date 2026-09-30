import { useCallback, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import {
  billingService,
  type BillingState,
  type PlanDescriptor,
  type ProQuote,
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
  const [quote, setQuote] = useState<ProQuote | null>(null)

  // The Mercado Pago price is optional: if it can't be loaded the page still
  // works (promo codes) and the pay button is just hidden.
  const loadQuote = useCallback(async () => {
    try {
      setQuote(await billingService.getQuote())
    } catch {
      setQuote({ available: false })
    }
  }, [])

  const recargar = useCallback(async () => {
    void loadQuote()
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
  }, [loadQuote])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const redeem = useCallback(async (code: string) => {
    const next = await billingService.redeem(code.trim())
    setState(next)
    return next
  }, [])

  /** Re-reads the plan without the full-page loading state (e.g. after a payment). */
  const refreshState = useCallback(async () => {
    try {
      setState(await billingService.getState())
    } catch {
      // Keep the current state; the next full reload will surface errors.
    }
  }, [])

  return {
    state,
    plans,
    quote,
    loading,
    error,
    recargar,
    redeem,
    refreshState,
    messageFromError,
  }
}
