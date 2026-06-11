import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { Spinner, Button } from '../components/UI'
import { useSkillTree } from '../hooks/useSkillTree'
import type { SkillNode } from '../services/skillTreeService'

const ICONS: Record<string, string> = {
  target: '🎯',
  link: '🔗',
  'trending-up': '📈',
  sigma: '∑',
  rocket: '🚀',
  star: '⭐',
}

function nodeIcon(iconKey: string) {
  return ICONS[iconKey] ?? '⭐'
}

function nodeStatus(node: SkillNode) {
  if (node.unlocked) {
    return 'border-[#f5c518] bg-gradient-to-br from-[rgba(245,197,24,0.18)] to-[rgba(124,58,237,0.24)] bg-surface'
  }

  if (node.prerequisitesMet) {
    return 'border-accent-light shadow-[0_0_12px_rgba(124,58,237,0.3)] animate-skill-pulse'
  }

  return 'opacity-[0.92] saturate-[0.62] border-white/[0.12]'
}

function nodeStatusLabel(node: SkillNode) {
  if (node.unlocked) {
    return 'Desbloqueado'
  }

  if (node.prerequisitesMet) {
    return 'Disponible'
  }

  return 'Bloqueado'
}

const NODE_WIDTH = 164
const NODE_HEIGHT = 112
const GRID_GAP_X = 52
const GRID_GAP_Y = 40
const SCENE_PADDING = 40
const MIN_SCALE = 0.6
const MAX_SCALE = 2.2
const VIEWPORT_PADDING = 28

function pointForNode(node: SkillNode) {
  const x = SCENE_PADDING + node.col * (NODE_WIDTH + GRID_GAP_X)
  const y = SCENE_PADDING + node.row * (NODE_HEIGHT + GRID_GAP_Y)
  return { x, y }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampViewport(
  nextViewport: { x: number; y: number; scale: number },
  canvas: HTMLDivElement | null,
  sceneWidth: number,
  sceneHeight: number,
) {
  if (!canvas) {
    return nextViewport
  }

  const scaledWidth = sceneWidth * nextViewport.scale
  const scaledHeight = sceneHeight * nextViewport.scale
  const availableWidth = canvas.clientWidth
  const availableHeight = canvas.clientHeight

  const minX = scaledWidth <= availableWidth
    ? (availableWidth - scaledWidth) / 2
    : availableWidth - scaledWidth - VIEWPORT_PADDING
  const maxX = scaledWidth <= availableWidth
    ? minX
    : VIEWPORT_PADDING

  const minY = scaledHeight <= availableHeight
    ? (availableHeight - scaledHeight) / 2
    : availableHeight - scaledHeight - VIEWPORT_PADDING
  const maxY = scaledHeight <= availableHeight
    ? minY
    : VIEWPORT_PADDING

  return {
    ...nextViewport,
    x: clamp(nextViewport.x, minX, maxX),
    y: clamp(nextViewport.y, minY, maxY),
  }
}

function fitViewport(canvas: HTMLDivElement | null, sceneWidth: number, sceneHeight: number) {
  if (!canvas) {
    return { x: 0, y: 0, scale: 1 }
  }

  const availableWidth = Math.max(canvas.clientWidth - VIEWPORT_PADDING * 2, 1)
  const availableHeight = Math.max(canvas.clientHeight - VIEWPORT_PADDING * 2, 1)
  const scale = clamp(
    Math.min(availableWidth / sceneWidth, availableHeight / sceneHeight, 1),
    MIN_SCALE,
    MAX_SCALE,
  )

  return clampViewport({
    scale,
    x: (canvas.clientWidth - sceneWidth * scale) / 2,
    y: (canvas.clientHeight - sceneHeight * scale) / 2,
  }, canvas, sceneWidth, sceneHeight)
}

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
        <article className="flex flex-col gap-1 px-3.5 py-3 rounded-[18px] border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02] bg-surface">
          <span className="text-xl font-extrabold text-primary">{treeStats.progress}%</span>
          <span className="text-xs text-secondary">Progreso total</span>
        </article>
        <article className="flex flex-col gap-1 px-3.5 py-3 rounded-[18px] border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02] bg-surface">
          <span className="text-xl font-extrabold text-primary">{treeStats.unlocked}/{treeStats.total}</span>
          <span className="text-xs text-secondary">Nodos desbloqueados</span>
        </article>
        <article className="flex flex-col gap-1 px-3.5 py-3 rounded-[18px] border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02] bg-surface">
          <span className="text-xl font-extrabold text-primary">{treeStats.available}</span>
          <span className="text-xs text-secondary">Listos para seguir</span>
        </article>
        <article className="flex flex-col gap-1 px-3.5 py-3 rounded-[18px] border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02] bg-surface">
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
        <span className="inline-flex items-center justify-center min-w-[52px] h-[34px] px-2.5 rounded-full border border-white/8 bg-surface text-secondary text-xs font-bold" aria-live="polite">{Math.round(viewport.scale * 100)}%</span>
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
            {nodes.map((node) => {
              const position = pointForNode(node)

              return (
                <button
                  key={node.id}
                  className={[
                    'skill-node',
                    'absolute w-[164px] min-h-[112px] rounded-[12px] border border-white/8 p-2 flex flex-col items-center justify-center gap-[5px] bg-surface transition-[transform,box-shadow,border-color,opacity] duration-150 z-[1] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(245,197,24,0.95)] focus-visible:outline-offset-[3px]',
                    nodeStatus(node),
                    selectedNodeId === node.id ? 'z-[3] shadow-[0_0_0_2px_rgba(245,197,24,0.28),0_10px_22px_rgba(0,0,0,0.22)]' : '',
                    selectedNode && selectedNodeId !== node.id ? 'opacity-30' : '',
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
                    setSelectedNodeId(node.id)
                  }}
                >
                  <span className={`absolute top-1.5 right-1.5 text-[9px] rounded-full px-1.5 py-0.5 border border-transparent text-secondary bg-white/[0.05] ${node.unlocked ? 'bg-[rgba(245,197,24,0.2)] border-[rgba(245,197,24,0.4)] text-[#f5c518]' : node.prerequisitesMet ? 'bg-[rgba(124,58,237,0.2)] border-[rgba(124,58,237,0.45)] text-[#c9a8ff]' : 'bg-white/[0.08] border-white/[0.18] text-[#bfc3d7]'}`}>
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
                      <div className="text-[11px] text-[#c8cbe0] font-semibold">
                        {node.topicXp}/{node.xpThreshold} XP
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="fixed left-4 right-4 bottom-[82px] rounded-[18px] border border-white/8 bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.5)] p-3.5 flex flex-col gap-2 z-[100] max-h-[min(42vh,360px)] overflow-auto" role="dialog" aria-live="polite" aria-label={`Detalle del nodo ${selectedNode.name}`}>
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <h3>{selectedNode.name}</h3>
              <p className="mt-0.5 text-xs text-secondary">{nodeStatusLabel(selectedNode)} · {selectedNode.topic}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedNodeId(null)}>
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
          {nextStepText && <p className="text-[13px] text-primary bg-white/[0.04] border border-white/8 rounded-[12px] p-3">Siguiente paso: {nextStepText}</p>}

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
      )}
    </MobileLayout>
  )
}

export default SkillTreePage
