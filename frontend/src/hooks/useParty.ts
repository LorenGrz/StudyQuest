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
  const [isPartyLoading, setIsPartyLoading] = useState(true)
  const [isChatLoading, setIsChatLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

  useEffect(() => {
    if (!partyId) return
    let cancelled = false

    // Cargar party y chat de forma independiente
    partyService.findById(partyId)
      .then((p) => {
        if (!cancelled) {
          setParty(p)
          setLoadError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setParty(null)
          setLoadError('No se pudo cargar la party.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsPartyLoading(false)
      })

    partyService.getChat(partyId)
      .then((msgs) => {
        if (!cancelled) {
          setMessages(msgs)
          setChatError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([])
          setChatError('No se pudo cargar el historial de mensajes.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsChatLoading(false)
      })

    socket.emit('party:join', { partyId })

    // Deduplicación por ID para evitar doble render (el backend emite
    // chat:message dos veces para mensajes file/audio)
    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, normalizeChatMessage(msg)]
      })
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
    isPartyLoading,
    isChatLoading,
    loadError,
    chatError,
    currentUserId: user?.id ?? '',
  }
}
