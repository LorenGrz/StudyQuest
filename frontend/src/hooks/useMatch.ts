import { useCallback, useState } from 'react'
import { partyService, type Party } from '../services/partyService'

export type MatchStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export function useMatch() {
  const [parties, setParties] = useState<Party[]>([])
  const [status, setStatus] = useState<MatchStatus>('idle')
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

  const discard = useCallback((partyId: string) => {
    setParties((prev) => {
      const next = prev.filter((party) => party.id !== partyId)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }, [])

  const join = useCallback(async (partyId: string): Promise<Party> => {
    const party = await partyService.join(partyId)

    setParties((prev) => {
      const next = prev.filter((candidate) => candidate.id !== partyId)
      if (next.length === 0) setStatus('empty')
      return next
    })

    return party
  }, [])

  const top = parties[parties.length - 1] ?? null

  return { parties, top, status, error, load, discard, join }
}
