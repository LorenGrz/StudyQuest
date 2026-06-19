import { Button } from '../../components/UI'
import type { SkillNode } from '../../services/skillTreeService'
import { nodeStatusLabel } from './utils'

interface SkillDetailsModalProps {
  selectedNode: SkillNode | null
  nextStepText: string | null
  nodeNameById: Map<string, string>
  onClose: () => void
}

export function SkillDetailsModal({
  selectedNode,
  nextStepText,
  nodeNameById,
  onClose,
}: SkillDetailsModalProps) {
  if (!selectedNode) return null

  return (
    <div className="fixed left-4 right-4 bottom-[82px] rounded-[18px] border border-[var(--overlay-border)] bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.5)] p-3.5 flex flex-col gap-2 z-[100] max-h-[min(42vh,360px)] overflow-auto" role="dialog" aria-live="polite" aria-label={`Detalle del nodo ${selectedNode.name}`}>
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <h3>{selectedNode.name}</h3>
          <p className="mt-0.5 text-xs text-secondary">{nodeStatusLabel(selectedNode)} · {selectedNode.topic}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <p>{selectedNode.description ?? 'Sin descripcion disponible.'}</p>
      <div className="flex flex-col gap-1.5">
        <div className="w-full h-[5px] rounded-full bg-elevated overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
            style={{ width: `${selectedNode.progressPercent}%` }}
          />
        </div>
        <p className="text-[13px] text-[#ccd0e5]">
          Progreso: {selectedNode.topicXp}/{selectedNode.xpThreshold} XP · {selectedNode.progressPercent}%
        </p>
      </div>
      {nextStepText && <p className="text-[13px] text-primary bg-white/[0.04] border border-[var(--overlay-border)] rounded-[12px] p-3">Siguiente paso: {nextStepText}</p>}

      {!selectedNode.unlocked && !selectedNode.prerequisitesMet && (
        <div className="mt-1 text-[13px]">
          <strong>Falta desbloquear:</strong>
          <ul>
            {selectedNode.prerequisiteIds.map((id) => (
              <li key={id}>{nodeNameById.get(id) ?? 'Nodo requerido'}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
