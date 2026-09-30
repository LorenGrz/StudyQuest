import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Badge, Input, Select } from '../UI'
import { useUniversityCareers } from '../../hooks/useUniversities'
import type { AdminCareerRequest, ApproveCareerRequestPayload } from '../../services/adminService'

const LEVEL_OPTIONS = [
  { value: 'grado', label: 'Grado' },
  { value: 'pregrado', label: 'Pregrado' },
]

interface Props {
  request: AdminCareerRequest
  onApprove: (id: string, payload: ApproveCareerRequestPayload) => Promise<void>
  onReject: (id: string, adminNote?: string) => Promise<void>
  messageFromError: (err: unknown, fallback: string) => string
}

/** One pending "Otra" career request: inline approve (link/create) or reject. */
export function CareerRequestCard({ request, onApprove, onReject, messageFromError }: Props) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle')
  const [name, setName] = useState(request.name)
  const [faculty, setFaculty] = useState('')
  const [level, setLevel] = useState<'grado' | 'pregrado'>('grado')
  const [careerId, setCareerId] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [busy, setBusy] = useState(false)

  const { careers, isLoading: loadingCareers } = useUniversityCareers(request.universityId)

  const submitApprove = async () => {
    setBusy(true)
    try {
      const payload: ApproveCareerRequestPayload = careerId
        ? { careerId }
        : { name: name.trim(), faculty: faculty.trim() || undefined, level }
      await onApprove(request.id, payload)
      toast.success('Pedido aprobado')
      setMode('idle')
    } catch (err) {
      toast.error(messageFromError(err, 'No se pudo aprobar el pedido.'))
    } finally {
      setBusy(false)
    }
  }

  const submitReject = async () => {
    setBusy(true)
    try {
      await onReject(request.id, adminNote.trim() || undefined)
      toast.success('Pedido rechazado')
      setMode('idle')
    } catch (err) {
      toast.error(messageFromError(err, 'No se pudo rechazar el pedido.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-surface border border-edge rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">{request.name}</p>
          <p className="text-xs text-muted mt-0.5">
            {request.universityName ?? 'Universidad desconocida'} · pedida por{' '}
            {request.displayName ?? request.username ?? request.userId}
          </p>
        </div>
        <Badge variant="warning">Pendiente</Badge>
      </div>

      {mode === 'idle' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setMode('approve')}>
            Aprobar
          </Button>
          <Button size="sm" variant="danger" onClick={() => setMode('reject')}>
            Rechazar
          </Button>
        </div>
      )}

      {mode === 'approve' && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-elevated border border-edge">
          {careers.length > 0 && (
            <Select
              id={`career-existing-${request.id}`}
              label="Vincular a una carrera existente (opcional)"
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              options={careers.map((c) => ({ value: c.id, label: c.name }))}
              disabled={loadingCareers}
            />
          )}
          {!careerId && (
            <>
              <Input
                id={`career-name-${request.id}`}
                label="Nombre de la carrera nueva"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                id={`career-faculty-${request.id}`}
                label="Facultad (opcional)"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
              />
              <Select
                id={`career-level-${request.id}`}
                label="Nivel"
                value={level}
                onChange={(e) => setLevel(e.target.value as 'grado' | 'pregrado')}
                options={LEVEL_OPTIONS}
              />
            </>
          )}
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              isLoading={busy}
              disabled={!careerId && !name.trim()}
              onClick={() => void submitApprove()}
            >
              Confirmar aprobación
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setMode('idle')}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {mode === 'reject' && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-danger/5 border border-danger/30">
          <p className="text-[13px] text-secondary m-0">¿Rechazás este pedido?</p>
          <Input
            id={`reject-note-${request.id}`}
            label="Nota para el alumno (opcional)"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              isLoading={busy}
              onClick={() => void submitReject()}
            >
              Sí, rechazar
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
