import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { Spinner, Button } from '../components/UI'
import { useSkillTree } from '../hooks/useSkillTree'
import {
  clamp,
  clampViewport,
  fitViewport,
  MIN_SCALE,
  MAX_SCALE,
  SCENE_PADDING,
  NODE_WIDTH,
  GRID_GAP_X,
  NODE_HEIGHT,
  GRID_GAP_Y,
  pointForNode
} from '../components/skill-tree/utils'
import { SkillDetailsModal } from '../components/skill-tree/SkillDetailsModal'
import { SkillNodeItem } from '../components/skill-tree/SkillNodeItem'

const SkillTreePage = () => {
  const navigate = useNavigate()
  const { subjectId = '' } = useParams<{ subjectId: string }>()
  const { nodes, isLoading, error, reload } = useSkillTree(subjectId)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 })
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    lastX: number
    lastY: number
    moved: boolean
  } | null>(null)
  const suppressClickUntilRef = useRef(0)
  const didFitViewportRef = useRef(false)

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  )

  const nodesById = useMemo(() => {
    return new Map(nodes.map((node) => [node.id, node]))
  }, [nodes])

  const nodeNameById = useMemo(() => {
    return new Map(nodes.map((node) => [node.id, node.name]))
  }, [nodes])

  const maxCol = useMemo(() => {
    return nodes.reduce((max, node) => Math.max(max, node.col), 0)
  }, [nodes])

  const maxRow = useMemo(() => {
    return nodes.reduce((max, node) => Math.max(max, node.row), 0)
  }, [nodes])

  const sceneWidth = useMemo(() => {
    return SCENE_PADDING * 2 + (maxCol + 1) * NODE_WIDTH + Math.max(0, maxCol) * GRID_GAP_X
  }, [maxCol])

  const sceneHeight = useMemo(() => {
    return SCENE_PADDING * 2 + (maxRow + 1) * NODE_HEIGHT + Math.max(0, maxRow) * GRID_GAP_Y
  }, [maxRow])

  const edges = useMemo(() => {
    const lines: Array<{
      id: string
      fromId: string
      toId: string
      fromX: number
      fromY: number
      toX: number
      toY: number
      unlocked: boolean
    }> = []

    nodes.forEach((node) => {
      node.prerequisiteIds.forEach((prerequisiteId) => {
        const prerequisite = nodesById.get(prerequisiteId)
        if (!prerequisite) return

        const from = pointForNode(prerequisite)
        const to = pointForNode(node)

        lines.push({
          id: `${prerequisite.id}-${node.id}`,
          fromId: prerequisite.id,
          toId: node.id,
          fromX: from.x + NODE_WIDTH / 2,
          fromY: from.y + NODE_HEIGHT / 2,
          toX: to.x + NODE_WIDTH / 2,
          toY: to.y + NODE_HEIGHT / 2,
          unlocked: prerequisite.unlocked,
        })
      })
    })

    return lines
  }, [nodes, nodesById])

  const treeStats = useMemo(() => {
    const total = nodes.length
    const unlocked = nodes.filter((node) => node.unlocked).length
    const available = nodes.filter((node) => !node.unlocked && node.prerequisitesMet).length
    const locked = total - unlocked - available
    const progress = total > 0 ? Math.round((unlocked / total) * 100) : 0

    return { total, unlocked, available, locked, progress }
  }, [nodes])

  const selectedPathIds = useMemo(() => {
    if (!selectedNode) {
      return new Set<string>()
    }

    const visited = new Set<string>()
    const stack = [selectedNode.id]

    while (stack.length > 0) {
      const currentId = stack.pop()
      if (!currentId || visited.has(currentId)) {
        continue
      }

      visited.add(currentId)
      const currentNode = nodesById.get(currentId)
      currentNode?.prerequisiteIds.forEach((prerequisiteId) => {
        if (!visited.has(prerequisiteId)) {
          stack.push(prerequisiteId)
        }
      })
    }

    return visited
  }, [selectedNode, nodesById])

  const selectedEdgeIds = useMemo(() => {
    if (!selectedNode) {
      return new Set<string>()
    }

    return new Set(
      edges
        .filter((edge) => selectedPathIds.has(edge.fromId) && selectedPathIds.has(edge.toId))
        .map((edge) => edge.id),
    )
  }, [edges, selectedNode, selectedPathIds])

  const nextStepText = useMemo(() => {
    if (!selectedNode) {
      return null
    }

    if (selectedNode.unlocked) {
      return 'Nodo completado. Podés seguir con sus ramas dependientes o reforzar el tema con más XP.'
    }

    if (!selectedNode.prerequisitesMet) {
      return 'Desbloqueá primero los nodos requeridos para abrir esta mejora.'
    }

    const remainingXp = Math.max(0, selectedNode.xpThreshold - selectedNode.topicXp)
    if (remainingXp === 0) {
      return 'Cumpliste la XP necesaria. Revisá si ya podés desbloquear este nodo.'
    }

    return `Te faltan ${remainingXp} XP en ${selectedNode.topic} para avanzar sobre este nodo.`
  }, [selectedNode])

  useEffect(() => {
    didFitViewportRef.current = false
  }, [subjectId])

  useEffect(() => {
    if (!nodes.length || !canvasRef.current || didFitViewportRef.current) {
      return
    }

    setViewport(fitViewport(canvasRef.current, sceneWidth, sceneHeight))
    didFitViewportRef.current = true
  }, [nodes.length, sceneWidth, sceneHeight])

  const updateViewport = (updater: (prev: { x: number; y: number; scale: number }) => { x: number; y: number; scale: number }) => {
    setViewport((prev) => clampViewport(updater(prev), canvasRef.current, sceneWidth, sceneHeight))
  }

  const centerTree = () => {
    setViewport(fitViewport(canvasRef.current, sceneWidth, sceneHeight))
  }

  const zoomBy = (zoomFactor: number) => {
    if (!canvasRef.current) {
      return
    }

    const localX = canvasRef.current.clientWidth / 2
    const localY = canvasRef.current.clientHeight / 2

    updateViewport((prev) => {
      const nextScale = clamp(prev.scale * zoomFactor, MIN_SCALE, MAX_SCALE)
      const worldX = (localX - prev.x) / prev.scale
      const worldY = (localY - prev.y) / prev.scale

      return {
        scale: nextScale,
        x: localX - worldX * nextScale,
        y: localY - worldY * nextScale,
      }
    })
  }

  const onCanvasPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('.skill-node')) {
      return
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onCanvasPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const dx = event.clientX - drag.lastX
    const dy = event.clientY - drag.lastY
    drag.lastX = event.clientX
    drag.lastY = event.clientY

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      drag.moved = true
    }

    updateViewport((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }))
  }

  const endDrag = () => {
    const drag = dragStateRef.current
    if (drag?.moved) {
      suppressClickUntilRef.current = Date.now() + 150
    }
    dragStateRef.current = null
  }

  const onCanvasWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    if ((event.ctrlKey || event.metaKey) && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const localX = event.clientX - rect.left
      const localY = event.clientY - rect.top

      updateViewport((prev) => {
        const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08
        const nextScale = clamp(prev.scale * zoomFactor, MIN_SCALE, MAX_SCALE)
        if (nextScale === prev.scale) {
          return prev
        }

        const worldX = (localX - prev.x) / prev.scale
        const worldY = (localY - prev.y) / prev.scale

        return {
          scale: nextScale,
          x: localX - worldX * nextScale,
          y: localY - worldY * nextScale,
        }
      })

      return
    }

    updateViewport((prev) => ({
      ...prev,
      x: prev.x - event.deltaX,
      y: prev.y - event.deltaY,
    }))
  }

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex justify-center items-center min-h-[200px]">
          <Spinner />
        </div>
      </MobileLayout>
    )
  }

  if (error) {
    return (
      <MobileLayout>
        <div className="flex flex-col gap-1.5 pt-2.5 pb-1.5">
          <Button className="w-fit font-bold" variant="secondary" size="sm" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
          <h1 className="text-2xl font-extrabold pt-5 pb-2">Árbol de habilidades</h1>
        </div>
        <div className="px-4 py-3 rounded-[12px] text-sm bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.2)]">{error}</div>
        <Button onClick={reload}>Reintentar</Button>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="flex flex-col gap-1.5 pt-2.5 pb-1.5">
        <Button className="w-fit font-bold" variant="secondary" size="sm" onClick={() => navigate(-1)}>
          ← Volver
        </Button>
        <h1 className="text-2xl font-extrabold pt-5 pb-2">Árbol de habilidades</h1>
        <p className="text-[13px] text-secondary leading-[1.4]">
          Ganá XP por tema y desbloqueá nodos al completar los requisitos.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-2.5 my-2 mb-3" aria-label="Resumen de progreso del árbol de habilidades">
        <article className="flex flex-col gap-1 px-3.5 py-3 rounded-[18px] border border-[var(--overlay-border)] bg-gradient-to-b from-white/[0.04] to-white/[0.02] bg-surface">
          <span className="text-xl font-extrabold text-primary">{treeStats.progress}%</span>
          <span className="text-xs text-secondary">Progreso total</span>
        </article>
        <article className="flex flex-col gap-1 px-3.5 py-3 rounded-[18px] border border-[var(--overlay-border)] bg-gradient-to-b from-white/[0.04] to-white/[0.02] bg-surface">
          <span className="text-xl font-extrabold text-primary">{treeStats.unlocked}/{treeStats.total}</span>
          <span className="text-xs text-secondary">Nodos desbloqueados</span>
        </article>
        <article className="flex flex-col gap-1 px-3.5 py-3 rounded-[18px] border border-[var(--overlay-border)] bg-gradient-to-b from-white/[0.04] to-white/[0.02] bg-surface">
          <span className="text-xl font-extrabold text-primary">{treeStats.available}</span>
          <span className="text-xs text-secondary">Listos para seguir</span>
        </article>
        <article className="flex flex-col gap-1 px-3.5 py-3 rounded-[18px] border border-[var(--overlay-border)] bg-gradient-to-b from-white/[0.04] to-white/[0.02] bg-surface">
          <span className="text-xl font-extrabold text-primary">{treeStats.locked}</span>
          <span className="text-xs text-secondary">Todavía bloqueados</span>
        </article>
      </section>

      <div className="flex flex-wrap gap-2 mb-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
          <span className="w-[9px] h-[9px] rounded-full bg-[#f5c518]" /> Desbloqueado
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
          <span className="w-[9px] h-[9px] rounded-full bg-accent-light" /> Disponible
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
          <span className="w-[9px] h-[9px] rounded-full bg-[#6f7287]" /> Bloqueado
        </span>
      </div>

      <p className="text-xs text-muted my-0.5 mb-2.5">Arrastrá para mover, usá la rueda para recorrer, y Ctrl + rueda para zoom.</p>

      <div className="flex items-center gap-2 flex-wrap mb-2.5" aria-label="Controles de navegación del árbol">
        <Button size="sm" variant="secondary" onClick={() => zoomBy(1.12)} aria-label="Acercar árbol">
          + Zoom
        </Button>
        <Button size="sm" variant="secondary" onClick={() => zoomBy(0.9)} aria-label="Alejar árbol">
          - Zoom
        </Button>
        <Button size="sm" variant="ghost" onClick={centerTree} aria-label="Centrar árbol">
          Recentrar
        </Button>
        <span className="inline-flex items-center justify-center min-w-[52px] h-[34px] px-2.5 rounded-full border border-[var(--overlay-border)] bg-surface text-secondary text-xs font-bold" aria-live="polite">{Math.round(viewport.scale * 100)}%</span>
      </div>

      <div
        ref={canvasRef}
        className="relative mb-[18px] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.12),transparent_55%)] border border-white/[0.06] rounded-[24px] min-h-[58vh] overflow-hidden cursor-grab touch-none active:cursor-grabbing"
        aria-label="Mapa interactivo del árbol de habilidades"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onCanvasWheel}
      >
        <div
          className="absolute left-0 top-0 origin-top-left isolate"
          style={{
            width: sceneWidth,
            height: sceneHeight,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" viewBox={`0 0 ${sceneWidth} ${sceneHeight}`} preserveAspectRatio="none">
            {edges.map((edge, index) => (
              <line
                key={`${edge.id}-${index}`}
                className={[
                  'skill-tree-edge',
                  edge.unlocked ? 'skill-tree-edge--active' : '',
                  selectedNode ? 'skill-tree-edge--dimmed' : '',
                  selectedEdgeIds.has(edge.id) ? 'skill-tree-edge--focused' : '',
                ].filter(Boolean).join(' ')}
                x1={edge.fromX}
                y1={edge.fromY}
                x2={edge.toX}
                y2={edge.toY}
              />
            ))}
          </svg>

          <div className="absolute inset-0 z-[2]">
            {nodes.map((node) => (
              <SkillNodeItem
                key={node.id}
                node={node}
                selectedNodeId={selectedNodeId}
                hasSelectedNode={!!selectedNode}
                suppressClickUntilRef={suppressClickUntilRef}
                onSelect={setSelectedNodeId}
              />
            ))}
          </div>
        </div>
      </div>

      <SkillDetailsModal
        selectedNode={selectedNode}
        nextStepText={nextStepText}
        nodeNameById={nodeNameById}
        onClose={() => setSelectedNodeId(null)}
      />
    </MobileLayout>
  )
}

export default SkillTreePage
