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
    return 'skill-node--unlocked'
  }

  if (node.prerequisitesMet) {
    return 'skill-node--available'
  }

  return 'skill-node--locked'
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
        <div className="center-spinner">
          <Spinner />
        </div>
      </MobileLayout>
    )
  }

  if (error) {
    return (
      <MobileLayout>
        <div className="skill-tree-header">
          <Button className="skill-tree-back-btn" variant="secondary" size="sm" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
          <h1 className="page-title">Árbol de habilidades</h1>
        </div>
        <div className="alert alert-danger">{error}</div>
        <Button onClick={reload}>Reintentar</Button>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="skill-tree-header">
        <Button className="skill-tree-back-btn" variant="secondary" size="sm" onClick={() => navigate(-1)}>
          ← Volver
        </Button>
        <h1 className="page-title">Árbol de habilidades</h1>
        <p className="skill-tree-subtitle">
          Ganá XP por tema y desbloqueá nodos al completar los requisitos.
        </p>
      </div>

      <section className="skill-tree-summary" aria-label="Resumen de progreso del árbol de habilidades">
        <article className="skill-tree-summary-card">
          <span className="skill-tree-summary-value">{treeStats.progress}%</span>
          <span className="skill-tree-summary-label">Progreso total</span>
        </article>
        <article className="skill-tree-summary-card">
          <span className="skill-tree-summary-value">{treeStats.unlocked}/{treeStats.total}</span>
          <span className="skill-tree-summary-label">Nodos desbloqueados</span>
        </article>
        <article className="skill-tree-summary-card">
          <span className="skill-tree-summary-value">{treeStats.available}</span>
          <span className="skill-tree-summary-label">Listos para seguir</span>
        </article>
        <article className="skill-tree-summary-card">
          <span className="skill-tree-summary-value">{treeStats.locked}</span>
          <span className="skill-tree-summary-label">Todavía bloqueados</span>
        </article>
      </section>

      <div className="skill-tree-legend">
        <span className="skill-tree-legend-item">
          <span className="skill-tree-dot skill-tree-dot--unlocked" /> Desbloqueado
        </span>
        <span className="skill-tree-legend-item">
          <span className="skill-tree-dot skill-tree-dot--available" /> Disponible
        </span>
        <span className="skill-tree-legend-item">
          <span className="skill-tree-dot skill-tree-dot--locked" /> Bloqueado
        </span>
      </div>

      <p className="skill-tree-nav-help">Arrastrá para mover, usá la rueda para recorrer, y Ctrl + rueda para zoom.</p>

      <div className="skill-tree-toolbar" aria-label="Controles de navegación del árbol">
        <Button size="sm" variant="secondary" onClick={() => zoomBy(1.12)} aria-label="Acercar árbol">
          + Zoom
        </Button>
        <Button size="sm" variant="secondary" onClick={() => zoomBy(0.9)} aria-label="Alejar árbol">
          - Zoom
        </Button>
        <Button size="sm" variant="ghost" onClick={centerTree} aria-label="Centrar árbol">
          Recentrar
        </Button>
        <span className="skill-tree-toolbar-scale" aria-live="polite">{Math.round(viewport.scale * 100)}%</span>
      </div>

      <div
        ref={canvasRef}
        className="skill-tree-canvas"
        aria-label="Mapa interactivo del árbol de habilidades"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onCanvasWheel}
      >
        <div
          className="skill-tree-scene"
          style={{
            width: sceneWidth,
            height: sceneHeight,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          }}
        >
          <svg className="skill-tree-edges" viewBox={`0 0 ${sceneWidth} ${sceneHeight}`} preserveAspectRatio="none">
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

          <div className="skill-tree-node-layer">
            {nodes.map((node) => {
              const position = pointForNode(node)

              return (
                <button
                  key={node.id}
                  className={[
                    'skill-node',
                    nodeStatus(node),
                    selectedNodeId === node.id ? 'skill-node--selected' : '',
                    selectedNode ? 'skill-node--dimmed' : '',
                    selectedPathIds.has(node.id) ? 'skill-node--path' : '',
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
                  <span className={`skill-node__state skill-node__state--${nodeStatus(node).replace('skill-node--', '')}`}>
                    {nodeStatusLabel(node)}
                  </span>
                  <div className="skill-node__icon">{nodeIcon(node.iconKey)}</div>
                  <div className="skill-node__name">{node.name}</div>
                  {node.unlocked ? (
                    <div className="badge badge-success">Desbloqueado</div>
                  ) : (
                    <>
                      <div className="skill-node__progress">
                        <div
                          className="skill-node__progress-fill"
                          style={{ width: `${node.progressPercent}%` }}
                        />
                      </div>
                      <div className="skill-node__xp">
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
        <div className="skill-node-popover" role="dialog" aria-live="polite" aria-label={`Detalle del nodo ${selectedNode.name}`}>
          <div className="skill-node-popover-head">
            <div>
              <h3>{selectedNode.name}</h3>
              <p className="skill-node-popover-kicker">{nodeStatusLabel(selectedNode)} · {selectedNode.topic}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedNodeId(null)}>
              Cerrar
            </Button>
          </div>
          <p>{selectedNode.description ?? 'Sin descripcion disponible.'}</p>
          <div className="skill-node-popover-progress">
            <div className="skill-node__progress" aria-hidden="true">
              <div
                className="skill-node__progress-fill"
                style={{ width: `${selectedNode.progressPercent}%` }}
              />
            </div>
            <p className="skill-node-popover-xp">
              Progreso: {selectedNode.topicXp}/{selectedNode.xpThreshold} XP · {selectedNode.progressPercent}%
            </p>
          </div>
          {nextStepText && <p className="skill-node-popover-next-step">Siguiente paso: {nextStepText}</p>}

          {!selectedNode.unlocked && !selectedNode.prerequisitesMet && (
            <div className="skill-node-prereq-list">
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
