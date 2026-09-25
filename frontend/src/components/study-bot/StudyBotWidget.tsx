import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Send, X } from 'lucide-react'
import { billingService } from '../../services/billingService'
import { useStudyBotChat } from '../../hooks/useStudyBotChat'
import { Spinner } from '../UI'

/**
 * Floating study-bot chat, mounted once in AppShell so it's available from
 * every regular app page (not the quiz focus view). Pro-only: fetches the
 * caller's plan once and renders nothing for free users.
 */
export function StudyBotWidget() {
  const [studyBotEnabled, setStudyBotEnabled] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, sending, error, send } = useStudyBotChat()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    billingService
      .getState()
      .then((state) => {
        if (!cancelled) setStudyBotEnabled(state.limits.studyBotEnabled)
      })
      .catch(() => {
        // Sin plan (offline, 401 en boot, etc.) → simplemente no mostramos el widget.
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = listRef.current
    el?.scrollTo?.({ top: el.scrollHeight })
  }, [messages, sending])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  if (!studyBotEnabled) return null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    void send(input)
    setInput('')
  }

  return (
    <>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Cerrar bot de estudio' : 'Abrir bot de estudio'}
        aria-expanded={isOpen}
        className="fixed right-4 bottom-20 md:bottom-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-accent text-on-accent shadow-lg hover:bg-accent-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {isOpen ? (
          <X size={22} aria-hidden="true" />
        ) : (
          <Sparkles size={22} aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Bot de estudio"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed right-4 bottom-36 md:bottom-24 z-40 w-[calc(100vw-2rem)] max-w-sm h-[28rem] max-h-[70vh] bg-surface border border-[var(--overlay-border)] rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-edge shrink-0">
              <Sparkles size={16} className="text-accent-light" aria-hidden="true" />
              <h2 className="text-sm font-bold text-primary">Bot de estudio</h2>
            </div>

            <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
              {messages.length === 0 && (
                <p className="text-sm text-muted text-center mt-6 px-4">
                  Preguntame sobre tus últimos quests: en qué materia venís bien, qué repasar, o
                  explicame un tema que ya estudiaste.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'self-end bg-accent text-on-accent'
                      : 'self-start bg-elevated text-primary'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {sending && (
                <div className="self-start flex items-center gap-2 px-3 py-2">
                  <Spinner size="sm" />
                </div>
              )}
              {error && (
                <p role="alert" className="self-stretch text-xs text-danger text-center px-2">
                  {error}
                </p>
              )}
            </div>

            <form onSubmit={onSubmit} className="flex items-center gap-2 p-3 border-t border-edge shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Preguntale algo..."
                aria-label="Mensaje para el bot de estudio"
                disabled={sending}
                className="flex-1 min-h-11 px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-primary text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Enviar"
                className="flex items-center justify-center w-11 h-11 shrink-0 rounded-lg bg-accent text-on-accent disabled:opacity-50 hover:bg-accent-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
