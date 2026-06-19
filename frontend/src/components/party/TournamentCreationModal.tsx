import { useState } from 'react'
import { Button } from '../../components/UI'
import { tournamentService } from '../../services/tournamentService'
import type { Quest } from '../../services/questService'

interface TournamentCreationModalProps {
  quest: Quest
  onClose: () => void
}

export function TournamentCreationModal({ quest, onClose }: TournamentCreationModalProps) {
  const [title, setTitle] = useState(`Torneo de ${quest.title}`)
  const [delayMin, setDelayMin] = useState(2)
  const [durationMin, setDurationMin] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const startsAt = new Date(Date.now() + delayMin * 60 * 1000).toISOString()
    const endsAt = new Date(Date.now() + (delayMin + durationMin) * 60 * 1000).toISOString()

    try {
      await tournamentService.create({
        title,
        questId: quest.id,
        startsAt,
        endsAt,
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear el torneo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-elevated border border-edge rounded-xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-primary text-center">
          🏆 Crear Torneo por Tiempo
        </h2>
        <p className="text-sm text-secondary text-center -mt-2">
          Múltiples parties competirán resolviendo esta quest en simultáneo.
        </p>

        {success ? (
          <div className="text-center py-6 text-success font-bold">
            ✓ ¡Torneo creado con éxito!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-secondary">Título del Torneo</label>
              <input
                className="w-full min-h-[2.75rem] px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-primary text-sm placeholder:text-muted transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Torneo de Álgebra..."
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-secondary">¿Cuándo empieza? (Cuenta regresiva)</label>
              <select
                className="w-full min-h-[2.75rem] px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-primary text-sm cursor-pointer transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                value={delayMin}
                onChange={(e) => setDelayMin(Number(e.target.value))}
              >
                <option value={1}>En 1 minuto</option>
                <option value={2}>En 2 minutos</option>
                <option value={5}>En 5 minutos</option>
                <option value={10}>En 10 minutos</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-secondary">¿Cuánto dura la competencia?</label>
              <select
                className="w-full min-h-[2.75rem] px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-primary text-sm cursor-pointer transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              >
                <option value={3}>3 minutos</option>
                <option value={5}>5 minutos</option>
                <option value={10}>10 minutos</option>
                <option value={20}>20 minutos</option>
                <option value={30}>30 minutos</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
                Crear ⚔️
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
