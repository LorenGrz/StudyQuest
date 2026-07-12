import { useLayoutEffect, useRef, useState } from 'react'
import { Paperclip, Send, Mic, Square } from 'lucide-react'
import { isAllowedChatFile } from './chatMessageGuards'
import { useFileDrop } from '../../hooks/useFileDrop'

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

  // Drag-and-drop + paste — reuses handleFile (which validates and reports errors).
  const { isDragging, dropZoneProps, onPaste } = useFileDrop({
    onFile: (file) => { void handleFile(file) },
    disabled: isRecording,
  })

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Tu navegador no soporta grabación de audio')
      return
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    const options: MediaRecorderOptions = {}
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4'
      }
    }

    const recorder = new MediaRecorder(stream, options)
    chunksRef.current = []
    startedAtRef.current = Date.now()
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = async () => {
      const durationMs = Date.now() - (startedAtRef.current ?? Date.now())
      const actualMimeType = recorder.mimeType || 'audio/webm'
      const extension = actualMimeType.includes('mp4') ? 'mp4' : (actualMimeType.includes('ogg') ? 'ogg' : 'webm')
      const blob = new Blob(chunksRef.current, { type: actualMimeType })
      const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: actualMimeType })
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
    <div
      {...dropZoneProps}
      className={`relative shrink-0 z-10 border-t bg-base px-3 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] transition-colors ${isDragging ? 'border-accent bg-accent-bg' : 'border-edge'}`}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-1 z-20 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent bg-base/85 text-sm font-medium text-accent-light">
          <Paperclip size={16} aria-hidden="true" />
          Soltá el archivo para adjuntarlo
        </div>
      )}
      <form className="flex items-end gap-2" onSubmit={submitText}>
        {/* Hidden native file input — labelled via <label htmlFor> so getByLabelText resolves it */}
        <label htmlFor="chat-file-input" className="sr-only">Adjuntar archivo</label>
        <input
          id="chat-file-input"
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => { void handleFile(e.target.files?.[0]) }}
        />

        {/* Attach button — accessible name comes from inner sr-only span so getByLabelText('Adjuntar archivo') only resolves the file input */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="size-11 shrink-0 flex items-center justify-center rounded-lg border border-edge text-secondary hover:text-primary hover:border-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Paperclip size={18} aria-hidden="true" />
          <span className="sr-only">Adjuntar archivo</span>
        </button>

        <div className={`flex-1 flex flex-col min-w-0 rounded-lg border transition-colors ${isRecording ? 'border-danger/60 bg-danger/5' : 'border-edge bg-surface'}`}>
          {isRecording && (
            <div className="flex items-center gap-2 px-3 pt-2 text-xs text-danger" aria-live="polite">
              <span className="inline-block w-2 h-2 rounded-full bg-danger animate-pulse" aria-hidden="true" />
              <span>Grabando audio...</span>
            </div>
          )}

          <textarea
            ref={messageInputRef}
            className="w-full resize-none bg-transparent px-3 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            placeholder={isRecording ? 'Tu nota de voz se está grabando' : 'Escribí un mensaje'}
            aria-label="Escribí un mensaje"
            rows={1}
          />
        </div>

        {trimmedText ? (
          <button
            type="submit"
            aria-label="Enviar mensaje"
            className="size-11 shrink-0 flex items-center justify-center rounded-lg bg-accent text-on-accent border border-accent hover:bg-accent-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
            onClick={() => void (isRecording ? stopRecording() : startRecording())}
            className={`size-11 shrink-0 flex items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isRecording
                ? 'bg-danger/10 border-danger/50 text-danger hover:bg-danger/20'
                : 'bg-accent text-on-accent border-accent hover:bg-accent-light'
            }`}
          >
            {isRecording ? (
              <Square size={16} aria-hidden="true" />
            ) : (
              <Mic size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </form>
      {error && <p className="mt-1 text-xs text-danger px-1">{error}</p>}
    </div>
  )
}
