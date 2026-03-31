import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { connectSocket, disconnectSocket } from '../services/socketService'
import { useAuthStore } from '../store/authStore'

export function useSocket(): { socket: Socket } {
  const { isAuthenticated } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      socketRef.current = connectSocket()
    }
    return () => {
      // No desconectar en cleanup para mantener conexión entre páginas
    }
  }, [isAuthenticated])

  const socket = socketRef.current ?? connectSocket()
  return { socket }
}
