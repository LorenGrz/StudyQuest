import { useCallback, useState } from 'react'
import { AxiosError } from 'axios'
import { studyBotService } from '../services/studyBotService'

export interface StudyBotMessage {
  id: string
  role: 'user' | 'bot'
  text: string
}

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const m = err.response?.data?.message
    if (Array.isArray(m) && m.length) return String(m[0])
    if (typeof m === 'string' && m.trim()) return m
    if (err.message) return err.message
  }
  return fallback
}

function messageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Chat state for the floating study-bot widget. No persistence on purpose —
 * the widget itself lives inside AppShell, so the conversation survives
 * navigation between pages for as long as the tab stays open. */
export function useStudyBotChat() {
  const [messages, setMessages] = useState<StudyBotMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || sending) return

      setError(null)
      setMessages((prev) => [...prev, { id: messageId(), role: 'user', text: trimmed }])
      setSending(true)
      try {
        const answer = await studyBotService.ask(trimmed)
        setMessages((prev) => [...prev, { id: messageId(), role: 'bot', text: answer }])
      } catch (err) {
        setError(messageFromError(err, 'No se pudo consultar al bot de estudio.'))
      } finally {
        setSending(false)
      }
    },
    [sending],
  )

  return { messages, sending, error, send }
}
