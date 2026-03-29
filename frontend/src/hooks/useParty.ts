import { useState, useEffect, useCallback } from 'react'
import { partyService, type Party, type ChatMessage } from '../services/partyService'
import { useSocket } from './useSocket'

export function useParty(partyId: string) {
  const { socket } = useSocket()
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
    }).finally(() => { if (!cancelled) setIsLoading(false) })

    // Escuchar mensajes en tiempo real
    socket.emit('party:join', partyId)
    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      cancelled = true
      socket.emit('party:leave', partyId)
      socket.off('chat:message')
    }
  }, [partyId, socket])

  const sendMessage = useCallback(async (text: string) => {
    // Optimistic update
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      text,
      userId: '',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    await partyService.sendMessage(partyId, text)
  }, [partyId])

  return { party, messages, sendMessage, isLoading }
}
