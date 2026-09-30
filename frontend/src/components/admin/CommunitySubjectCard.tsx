import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Badge, Input, Select } from '../UI'
import type { AdminCommunitySubject } from '../../services/adminService'

const SOURCE_LABEL: Record<AdminCommunitySubject['source'], string> = {
  official: 'Oficial',
  community: 'Comunidad',
  legacy: 'Legado',
}

interface Props {
  subject: AdminCommunitySubject
  /** Other subjects of the same university, for the merge target picker. */
  candidates: AdminCommunitySubject[]
  onPublish: (id: string) => Promise<void>
  onHide: (id: string) => Promise<void>
  onUnhide: (id: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onMerge: (fromId: string, toId: string) => Promise<void>
  messageFromError: (err: unknown, fallback: string) => string
}

/** One community subject row: publish, hide/unhide, rename, merge into another. */
export function CommunitySubjectCard({
  subject,
  candidates,
  onPublish,
  onHide,
  onUnhide,
  onRename,
  onMerge,
  messageFromError,
}: Props) {
  const [mode, setMode] = useState<'idle' | 'rename' | 'merge'>('idle')
  const [name, setName] = useState(subject.name)
  const [targetId, setTargetId] = useState('')
  const [busy, setBusy] = useState(false)

  const mergeOptions = candidates
    .filter((c) => c.id !== subject.id && c.universityId === subject.universityId)
    .map((c) => ({ value: c.id, label: `${c.name} (${c.enrolledCount} inscriptos)` }))

  const run = async (action: () => Promise<void>, okMessage: string, fallback: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(okMessage)
      setMode('idle')
    } catch (err) {
      toast.error(messageFromError(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-surface border border-edge rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">{subject.name}</p>
          <p className="text-xs text-muted mt-0.5">
            {subject.universityName ?? 'Sin universidad'} ·{' '}
            {subject.createdByUsername ? `@${subject.createdByUsername}` : 'sin autor'} ·{' '}
            {subject.enrolledCount} inscriptos
          </p>
          {subject.reportCount > 0 && (
            <p className="text-xs text-danger mt-0.5">
              {subject.reportCount} reporte{subject.reportCount === 1 ? '' : 's'}
              {subject.reportReasons.length > 0 ? `: ${subject.reportReasons.join(', ')}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="neutral">{SOURCE_LABEL[subject.source]}</Badge>
          {subject.visibility === 'private' && <Badge variant="warning">Privada</Badge>}
          {subject.status === 'hidden' && <Badge variant="danger">Oculta</Badge>}
        </div>
      </div>

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          {subject.visibility === 'private' && subject.status === 'active' && (
            <Button
              size="sm"
              onClick={() =>
                void run(() => onPublish(subject.id), 'Materia publicada', 'No se pudo publicar la materia.')
              }
              isLoading={busy}
            >
              Publicar
            </Button>
          )}
          {subject.status === 'active' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() =>
                void run(() => onHide(subject.id), 'Materia ocultada', 'No se pudo ocultar la materia.')
              }
              isLoading={busy}
            >
              Ocultar
            </Button>
          )}
          {subject.status === 'hidden' && (
            <Button
              size="sm"
              onClick={() =>
                void run(() => onUnhide(subject.id), 'Materia reactivada', 'No se pudo reactivar la materia.')
              }
              isLoading={busy}
            >
              Reactivar
            </Button>
          )}
          {subject.status !== 'merged' && (
            <Button size="sm" variant="secondary" onClick={() => setMode('rename')}>
              Renombrar
            </Button>
          )}
          {subject.status !== 'merged' && mergeOptions.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setMode('merge')}>
              Fusionar con…
            </Button>
          )}
        </div>
      )}

      {mode === 'rename' && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-elevated border border-edge">
          <Input
            id={`rename-${subject.id}`}
            label="Nuevo nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              isLoading={busy}
              disabled={!name.trim()}
              onClick={() =>
                void run(
                  () => onRename(subject.id, name.trim()),
                  'Materia renombrada',
                  'No se pudo renombrar la materia.',
                )
              }
            >
              Confirmar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setMode('idle')}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {mode === 'merge' && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-elevated border border-edge">
          <Select
            id={`merge-target-${subject.id}`}
            label="Fusionar esta materia con…"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            options={mergeOptions}
          />
          <p className="text-[12px] text-muted m-0">
            Se mueven inscripciones, parties, quests y el árbol de habilidades a la materia elegida;
            esta queda marcada como fusionada.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              isLoading={busy}
              disabled={!targetId}
              onClick={() =>
                void run(
                  () => onMerge(subject.id, targetId),
                  'Materias fusionadas',
                  'No se pudo fusionar la materia.',
                )
              }
            >
              Confirmar fusión
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setMode('idle')}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
