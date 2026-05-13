import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
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

function pointForNode(node: SkillNode) {
  const x = SCENE_PADDING + node.col * (NODE_WIDTH + GRID_GAP_X)
  const y = SCENE_PADDING + node.row * (NODE_HEIGHT + GRID_GAP_Y)
  return { x, y }
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

    setViewport((prev) => ({
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

      setViewport((prev) => {
        const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * zoomFactor))
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

    setViewport((prev) => ({
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

      <div
        ref={canvasRef}
        className="skill-tree-canvas"
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
                key={`${edge.fromX}-${edge.fromY}-${edge.toX}-${edge.toY}-${index}`}
                className={`skill-tree-edge ${edge.unlocked ? 'skill-tree-edge--active' : ''}`}
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
                  className={`skill-node ${nodeStatus(node)}`}
                  style={{
                    left: position.x,
                    top: position.y,
                  }}
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
        <div className="skill-node-popover">
          <div className="skill-node-popover-head">
            <h3>{selectedNode.name}</h3>
            <Button size="sm" variant="ghost" onClick={() => setSelectedNodeId(null)}>
              Cerrar
            </Button>
          </div>
          <p>{selectedNode.description ?? 'Sin descripcion disponible.'}</p>
          <p className="skill-node-popover-topic">Estado: {nodeStatusLabel(selectedNode)}</p>
          <p className="skill-node-popover-topic">Tema: {selectedNode.topic}</p>
          <p className="skill-node-popover-xp">
            Progreso: {selectedNode.topicXp}/{selectedNode.xpThreshold} XP
          </p>

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
