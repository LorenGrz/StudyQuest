import { useState, useEffect, useCallback } from 'react'
import { partyService, type Party, type ChatMessage } from '../services/partyService'
import { mockChatMessages } from '../services/mock/partyService.mock'
import { useSocket } from './useSocket'
import { useAuthStore } from '../store/authStore'

export function useParty(partyId: string) {
  const { socket } = useSocket()
  const { user } = useAuthStore()
  const [party, setParty] = useState<Party | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!partyId) return
    let cancelled = false

    Promise.all([
      partyService.findById(partyId),
      partyService.getChat(partyId),
    ]).then(([p, msgs]) => {
      if (!cancelled) {
        setParty(p)
        setMessages(msgs)
      }
    }).catch(() => {
      if (!cancelled) setMessages(mockChatMessages)
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })

    socket.emit('party:join', { partyId })
    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      cancelled = true
      socket.emit('party:leave', partyId)
      socket.off('chat:message')
    }
  }, [partyId, socket])

  const sendMessage = useCallback((text: string) => {
    if (socket.connected) {
      socket.emit('party:chat', { partyId, text })
    } else {
      const localMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        text,
        userId: user?.id ?? 'me',
        user: user
          ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
          : undefined,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, localMsg])
    }
  }, [partyId, socket, user])

  return { party, messages, sendMessage, isLoading, currentUserId: user?.id ?? '' }
}
