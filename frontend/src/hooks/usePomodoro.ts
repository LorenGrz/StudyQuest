import { useState, useEffect, useCallback } from 'react'
import { getSocket } from '../services/socketService'

export interface PomodoroState {
  isRunning: boolean
  timeLeft: number
  mode: 'work' | 'break'
  workDuration: number
  breakDuration: number
}

export function usePomodoro(partyId: string) {
  const [state, setState] = useState<PomodoroState>({
    isRunning: false,
    timeLeft: 25 * 60,
    mode: 'work',
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
  })

  useEffect(() => {
    if (!partyId) return

    const socket = getSocket()

    const handleSync = (newState: PomodoroState) => {
      setState(newState)
    }

    const handleFinished = (data: { mode: 'work' | 'break' }) => {
      // Optional: Play a sound or show notification here
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('StudyQuest Pomodoro', {
            body: data.mode === 'work' ? '¡Tiempo de estudiar!' : '¡Tiempo de descanso!',
          })
        }
      }
    }

    socket.on('pomodoro:sync', handleSync)
    socket.on('pomodoro:finished', handleFinished)

    // Ask for permission for notifications
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      socket.off('pomodoro:sync', handleSync)
      socket.off('pomodoro:finished', handleFinished)
    }
  }, [partyId])

  // Local tick if running, to keep UI smooth without hammering the server
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>

    if (state.isRunning && state.timeLeft > 0) {
      interval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          timeLeft: Math.max(0, prev.timeLeft - 1),
        }))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.isRunning, state.timeLeft])

  const start = useCallback(() => {
    getSocket().emit('pomodoro:start', { partyId })
  }, [partyId])

  const pause = useCallback(() => {
    getSocket().emit('pomodoro:pause', { partyId })
  }, [partyId])

  const reset = useCallback(() => {
    getSocket().emit('pomodoro:reset', { partyId })
  }, [partyId])

  const updateConfig = useCallback((workDuration: number, breakDuration: number) => {
    getSocket().emit('pomodoro:config', {
      partyId,
      workDuration,
      breakDuration,
    })
  }, [partyId])

  return {
    state,
    start,
    pause,
    reset,
    updateConfig,
  }
}
