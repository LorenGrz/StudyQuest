import type { SkillNode } from '../../services/skillTreeService'
import { nodeStatus, nodeStatusLabel, nodeIcon, pointForNode } from './utils'

interface SkillNodeItemProps {
  node: SkillNode
  selectedNodeId: string | null
  hasSelectedNode: boolean
  suppressClickUntilRef: React.MutableRefObject<number>
  onSelect: (id: string) => void
}

export function SkillNodeItem({
  node,
  selectedNodeId,
  hasSelectedNode,
  suppressClickUntilRef,
  onSelect,
}: SkillNodeItemProps) {
  const position = pointForNode(node)

  return (
    <button
      className={[
        'skill-node',
        'absolute w-[164px] min-h-[112px] rounded-[12px] border border-[var(--overlay-border)] p-2 flex flex-col items-center justify-center gap-[5px] bg-surface transition-[transform,box-shadow,border-color,opacity] duration-150 z-[1] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(245,197,24,0.95)] focus-visible:outline-offset-[3px]',
        nodeStatus(node),
        selectedNodeId === node.id ? 'z-[3] shadow-[0_0_0_2px_rgba(245,197,24,0.28),0_10px_22px_rgba(0,0,0,0.22)]' : '',
        hasSelectedNode && selectedNodeId !== node.id ? 'opacity-30' : '',
      ].filter(Boolean).join(' ')}
      style={{
        left: position.x,
        top: position.y,
      }}
      aria-label={`${node.name}. ${nodeStatusLabel(node)}. ${node.topicXp} de ${node.xpThreshold} XP en ${node.topic}.`}
      aria-pressed={selectedNodeId === node.id}
      onClick={() => {
        if (Date.now() < suppressClickUntilRef.current) {
          return
        }
        onSelect(node.id)
      }}
    >
      <span className={`absolute top-1.5 right-1.5 text-[9px] rounded-full px-1.5 py-0.5 border border-transparent text-secondary bg-[var(--overlay-soft)] ${node.unlocked ? 'bg-[rgba(245,197,24,0.2)] border-[rgba(245,197,24,0.4)] text-[#d97706] dark:text-[#f5c518]' : node.prerequisitesMet ? 'bg-[rgba(124,58,237,0.2)] border-[rgba(124,58,237,0.45)] text-accent-light' : 'bg-[var(--overlay-subtle)] border-[var(--overlay-border)] text-muted'}`}>
        {nodeStatusLabel(node)}
      </span>
      <div className="text-2xl leading-none">{nodeIcon(node.iconKey)}</div>
      <div className="text-xs font-bold text-center text-primary">{node.name}</div>
      {node.unlocked ? (
        <div className="badge badge-success">Desbloqueado</div>
      ) : (
        <>
          <div className="w-full h-[5px] rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
              style={{ width: `${node.progressPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-muted font-semibold">
            {node.topicXp}/{node.xpThreshold} XP
          </div>
        </>
      )}
    </button>
  )
}
