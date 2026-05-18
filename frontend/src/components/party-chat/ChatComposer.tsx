import { useLayoutEffect, useRef, useState } from 'react'
import { isAllowedChatFile } from './chatMessageGuards'

type Props = {
  onSendText: (text: string) => void
  onSendFile: (file: File) => Promise<void>
  onSendAudio: (file: File, durationMs: number) => Promise<void>
}

export function ChatComposer({ onSendText, onSendFile, onSendAudio }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number | null>(null)
  const trimmedText = text.trim()

  useLayoutEffect(() => {
    const textarea = messageInputRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    const nextHeight = Math.min(textarea.scrollHeight, 120)
    textarea.style.height = `${Math.max(24, nextHeight)}px`
  }, [text, isRecording])

  const submitText = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmedText) return
    onSendText(trimmedText)
    setText('')
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    if (!isAllowedChatFile(file)) {
      setError('Solo PDF, TXT, DOC o DOCX')
      return
    }
    setError(null)
    await onSendFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Tu navegador no soporta grabación de audio')
      return
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []
    startedAtRef.current = Date.now()
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = async () => {
      const durationMs = Date.now() - (startedAtRef.current ?? Date.now())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
      await onSendAudio(file, durationMs)
      stream.getTracks().forEach((track) => track.stop())
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setError(null)
    setIsRecording(true)
  }

  const stopRecording = async () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!trimmedText) return
      onSendText(trimmedText)
      setText('')
    }
  }

  return (
    <div className="chat-composer">
      <form className="chat-input-row" onSubmit={submitText}>
        <div className={`chat-input-shell${isRecording ? ' chat-input-shell-recording' : ''}`}>
          <button
            type="button"
            className="chat-icon-btn chat-icon-btn-muted"
            aria-label="Adjuntar archivo"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="chat-file-input"
            aria-label="Adjuntar archivo"
            accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => { void handleFile(e.target.files?.[0]) }}
          />

          <div className="chat-input-content">
            {isRecording && (
              <div className="chat-recording-indicator" aria-live="polite">
                <span className="chat-recording-dot" />
                <span>Grabando audio...</span>
              </div>
            )}

            <textarea
              ref={messageInputRef}
              className="chat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Tu nota de voz se está grabando' : 'Escribí un mensaje'}
              aria-label="Escribí un mensaje"
              rows={1}
            />
          </div>
        </div>

        {trimmedText ? (
          <button
            type="submit"
            className="chat-icon-btn chat-icon-btn-primary"
            aria-label="Enviar mensaje"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3.4 20.4 20.5 13a1 1 0 0 0 0-1.8L3.4 3.7a.9.9 0 0 0-1.3.9l1.1 6.2a1 1 0 0 0 .8.8l8.1 1.3-8.1 1.3a1 1 0 0 0-.8.8l-1.1 6.2a.9.9 0 0 0 1.3.9Z"
                fill="currentColor"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className={`chat-icon-btn ${isRecording ? 'chat-icon-btn-danger' : 'chat-icon-btn-primary'}`}
            aria-label={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
            onClick={() => void (isRecording ? stopRecording() : startRecording())}
          >
            {isRecording ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a1 1 0 1 1 2 0 7 7 0 1 1-14 0 1 1 0 1 1 2 0 5 5 0 1 0 10 0Zm-4 8a1 1 0 1 1-2 0v-2.1a7.9 7.9 0 0 0 2 0V20Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        )}
      </form>
      {error && <p className="chat-error">{error}</p>}
    </div>
  )
}
