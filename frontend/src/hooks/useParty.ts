import { useState, useEffect, useCallback } from 'react'
import {
  partyService,
  normalizeChatMessage,
  type Party,
  type ChatMessage,
} from '../services/partyService'
import { useSocket } from './useSocket'
import { useAuthStore } from '../store/authStore'

export function useParty(partyId: string) {
  const { socket } = useSocket()
  const { user } = useAuthStore()
  const [party, setParty] = useState<Party | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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
        setLoadError(null)
      }
    }).catch(() => {
      if (!cancelled) {
        setParty(null)
        setMessages([])
        setLoadError('No se pudo cargar la party o el chat.')
      }
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })

    socket.emit('party:join', { partyId })

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, normalizeChatMessage(msg)])
    })

    // Actualiza el estado de presencia de un miembro sin recargar toda la party
    socket.on('party:member-online', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setParty((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.userId === userId ? { ...m, isOnline } : m
          ),
        }
      })
    })

    return () => {
      cancelled = true
      socket.emit('party:leave', partyId)
      socket.off('chat:message')
      socket.off('party:member-online')
    }
  }, [partyId, socket])

  const sendTextMessage = useCallback((text: string) => {
    if (socket.connected) {
      socket.emit('party:chat', { partyId, text })
    } else {
      const localMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        type: 'text',
        text,
        userId: user?.id ?? 'me',
        user: user
          ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
          : undefined,
        attachment: null,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, localMsg])
    }
  }, [partyId, socket, user])

  const sendFileMessage = useCallback(async (file: File) => {
    await partyService.uploadFileMessage(partyId, file)
  }, [partyId])

  const sendAudioMessage = useCallback(async (file: File, durationMs: number) => {
    await partyService.uploadAudioMessage(partyId, file, durationMs)
  }, [partyId])

  return {
    party,
    setParty,
    messages,
    sendTextMessage,
    sendFileMessage,
    sendAudioMessage,
    isLoading,
    loadError,
    currentUserId: user?.id ?? '',
  }
}
