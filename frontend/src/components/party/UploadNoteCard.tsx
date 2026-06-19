import { useState, useRef } from 'react'
import { Sparkles, FileText, X, Paperclip } from 'lucide-react'
import { Button } from '../../components/UI'

interface UploadNoteCardProps {
  onUpload: (title: string, file?: File, textContent?: string) => Promise<unknown>
  isLoading: boolean
}

export function UploadNoteCard({ onUpload, isLoading }: UploadNoteCardProps) {
  const [title, setTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    const trimmedText = noteText.trim()

    if (!file && !trimmedText) {
      setError('Pegá al menos 100 caracteres o subí un PDF.')
      return
    }

    if (!file && trimmedText.length < 100) {
      setError(`El texto es muy corto. Faltan ${100 - trimmedText.length} caracteres para generar la quest.`)
      return
    }

    setError(null)

    try {
      await onUpload(title, file, trimmedText || undefined)
      setTitle('')
      setNoteText('')
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
    <form className="flex flex-col gap-3 bg-surface border border-edge rounded-lg p-4" onSubmit={submit}>
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
        <label className="text-[13px] font-medium text-secondary" htmlFor="quest-note">Texto del apunte</label>
        <textarea
          id="quest-note"
          className={`w-full min-h-24 px-3.5 py-2.5 bg-[var(--bg-input)] border rounded-lg text-primary text-sm placeholder:text-muted resize-y transition-[border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${error ? 'border-danger focus-visible:border-danger' : 'border-[var(--border)] focus-visible:border-accent'}`}
          value={noteText}
          onChange={(e) => {
            setNoteText(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Pegá acá el texto del apunte… (o subí un PDF abajo)"
          rows={4}
        />
        <p className="text-xs text-secondary">
          Si pegás texto, necesitás al menos 100 caracteres. Si subís PDF, el texto es opcional.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-secondary">Archivo PDF (opcional)</label>
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
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <Paperclip size={16} aria-hidden="true" />
            Elegí un PDF
          </label>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>Cancelar</Button>
        <Button type="submit" isLoading={isLoading}>Generar Quest ⚡</Button>
      </div>
    </form>
  )
}
