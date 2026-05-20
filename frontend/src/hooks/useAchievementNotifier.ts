import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useSocket } from './useSocket'

interface AchievementPayload {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: string
  points: number
}

export function useAchievementNotifier() {
  const { socket } = useSocket()

  useEffect(() => {
    const handler = (achievement: AchievementPayload) => {
      toast(`${achievement.icon} ¡Logro desbloqueado: ${achievement.name}!`, {
        duration: 4000,
        style: {
          background: '#1a1a2e',
          color: '#e2e8f0',
          border: '1px solid #7c3aed',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '14px',
        },
      })
    }

    socket.on('achievement:unlocked', handler)
    return () => {
      socket.off('achievement:unlocked', handler)
    }
  }, [socket])
}
