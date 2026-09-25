import { useState, useRef } from 'react'
import { Sparkles, FileText, X, Paperclip } from 'lucide-react'
import { Button } from '../../components/UI'
import { useFileDrop } from '../../hooks/useFileDrop'

const ACCEPTED_EXTS = [
  '.pdf', '.doc', '.docx', '.odt', '.md', '.markdown', '.txt', '.rtf',
  '.ppt', '.pptx', '.csv', '.html', '.epub',
]

const ACCEPT_ATTR = [
  ...ACCEPTED_EXTS,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
].join(',')

const MAX_INSTRUCTIONS = 1500

const isSupportedDoc = (file: File) => {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTS.some((ext) => name.endsWith(ext))
}

interface UploadNoteCardProps {
  onUpload: (title: string, file: File, instructions?: string) => Promise<unknown>
  isLoading: boolean
}

export function UploadNoteCard({ onUpload, isLoading }: UploadNoteCardProps) {
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    setSelectedFile(null)
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const rejectUnsupported = () =>
    setError('Formato no soportado. Usá PDF, Word, Markdown, TXT…')

  // Single entry point for the file input, drag-drop and paste — all validate.
  const pickFile = (file: File) => {
    if (!isSupportedDoc(file)) {
      rejectUnsupported()
      return
    }
    setSelectedFile(file)
    setFileName(file.name)
    if (error) setError(null)
  }

  // Drag-and-drop + paste of a document anywhere on the card.
  const { isDragging, dropZoneProps, onPaste } = useFileDrop({
    onFile: pickFile,
    accept: isSupportedDoc,
    onReject: rejectUnsupported,
    disabled: isLoading,
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = selectedFile

    if (!file) {
      setError('Subí un archivo (PDF, Word, Markdown, TXT…). Es la fuente del quiz.')
      return
    }

    setError(null)

    try {
      await onUpload(title, file, instructions.trim() || undefined)
      setTitle('')
      setInstructions('')
      setExpanded(false)
      clearFile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la quest.')
    }
  }

  if (!expanded) {
    return (
      <button
        className="w-full flex flex-col items-center gap-1 px-4 py-5 rounded-lg bg-surface border border-edge hover:border-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setExpanded(true)}
      >
        <Sparkles size={28} className="text-accent-light" aria-hidden="true" />
        <span className="font-semibold text-primary">Crear Quest con IA</span>
        <span className="text-xs text-muted">Subí un apunte → quiz automático</span>
      </button>
    )
  }

  return (
    <form
      {...dropZoneProps}
      onPaste={onPaste}
      className={`flex flex-col gap-3 bg-surface border rounded-lg p-4 transition-colors ${isDragging ? 'border-accent bg-accent-bg' : 'border-edge'}`}
      onSubmit={submit}
    >
      <h3 className="text-base font-bold text-primary">Nueva Quest</h3>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-secondary" htmlFor="quest-title">Título del quiz</label>
        <input
          id="quest-title"
          className="w-full min-h-[2.75rem] px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-primary text-sm placeholder:text-muted transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Procesos y concurrencia"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-secondary">Archivo del apunte</label>
        {fileName ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent-bg px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-sm text-primary">
              <FileText size={16} className="shrink-0 text-accent-light" aria-hidden="true" />
              <span className="truncate">{fileName}</span>
            </span>
            <button
              type="button"
              onClick={clearFile}
              className="shrink-0 rounded-md p-1 text-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Quitar archivo"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-edge bg-input px-3 py-2.5 text-sm text-secondary transition-colors hover:border-accent hover:text-primary focus-within:ring-2 focus-within:ring-accent">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) pickFile(file)
              }}
            />
            <Paperclip size={16} aria-hidden="true" />
            Elegí un archivo, arrastralo o pegalo (Ctrl+V)
          </label>
        )}
        <p className="text-xs text-secondary">
          PDF, Word, Markdown, TXT, PPTX, CSV… El quiz se genera a partir de este archivo.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-secondary" htmlFor="quest-instructions">
          Instrucciones / temas <span className="text-muted">(opcional)</span>
        </label>
        <textarea
          id="quest-instructions"
          className={`w-full min-h-20 px-3.5 py-2.5 bg-[var(--bg-input)] border rounded-lg text-primary text-sm placeholder:text-muted resize-y transition-[border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${error ? 'border-danger focus-visible:border-danger' : 'border-[var(--border)] focus-visible:border-accent'}`}
          value={instructions}
          maxLength={MAX_INSTRUCTIONS}
          onChange={(e) => {
            setInstructions(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Ej: enfocate en el capítulo 3; preguntas de aplicación, no de definiciones; nivel parcial."
          rows={3}
        />
        <p className="text-xs text-secondary">
          Reglas para orientar las preguntas (qué temas, enfoque, dificultad). No es el texto del apunte.
          <span className="ml-1 text-muted">{instructions.length}/{MAX_INSTRUCTIONS}</span>
        </p>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>Cancelar</Button>
        <Button type="submit" isLoading={isLoading}>Generar Quest ⚡</Button>
      </div>
    </form>
  )
}
