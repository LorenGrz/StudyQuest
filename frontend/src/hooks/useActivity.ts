import { useState, useEffect } from 'react'
import { partyService, type Activity } from '../services/partyService'
import { useSocket } from './useSocket'

export function useActivity(partyId: string) {
  const { socket } = useSocket()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!partyId) return
    let cancelled = false

    setIsLoading(true)
    partyService.getActivity(partyId).then((acts) => {
      if (!cancelled) {
        setActivities(acts)
      }
    }).catch((err) => {
      console.error('Error loading activities:', err)
      if (!cancelled) setActivities([])
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })

    // Escuchar nuevas actividades via WebSocket
    socket.on('party:activity', (payload: { activity: Activity }) => {
      if (!cancelled) {
        setActivities((prev) => [payload.activity, ...prev])
      }
    })

    return () => {
      cancelled = true
      socket.off('party:activity')
    }
  }, [partyId, socket])

  return { activities, isLoading }
}
