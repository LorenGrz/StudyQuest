import { useState, useCallback } from 'react'
import { partyService, type Party } from '../services/partyService'

export type DiscoveryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export function usePartySlide() {
  const [parties, setParties] = useState<Party[]>([])
  const [status, setStatus] = useState<DiscoveryStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const data = await partyService.discover()
      setParties(data)
      setStatus(data.length > 0 ? 'ready' : 'empty')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al cargar las parties')
      setStatus('error')
    }
  }, [])

  /** Eliminar del stack local sin llamar al backend (swipe left / descarte) */
  const discard = useCallback((partyId: string) => {
    setParties((prev) => {
      const next = prev.filter((p) => p.id !== partyId)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }, [])

  /** Unirse y eliminar del stack (swipe right / aprobar) */
  const join = useCallback(
    async (partyId: string): Promise<Party> => {
      const party = await partyService.join(partyId)
      setParties((prev) => {
        const next = prev.filter((p) => p.id !== partyId)
        if (next.length === 0) setStatus('empty')
        return next
      })
      return party
    },
    [],
  )

  /** Top de la pila (la tarjeta que se muestra arriba) */
  const top = parties[parties.length - 1] ?? null

  return { parties, top, status, error, load, discard, join }
}
