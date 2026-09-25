import type { SkillNode } from '../../services/skillTreeService'

export const ICONS: Record<string, string> = {
  target: '🎯',
  link: '🔗',
  'trending-up': '📈',
  sigma: '∑',
  rocket: '🚀',
  star: '⭐',
}

export function nodeIcon(iconKey: string) {
  return ICONS[iconKey] ?? '⭐'
}

export function nodeStatus(node: SkillNode) {
  if (node.unlocked) {
    return 'border-[#f5c518] bg-gradient-to-br from-[rgba(245,197,24,0.18)] to-[rgba(124,58,237,0.24)] bg-surface'
  }

  if (node.prerequisitesMet) {
    return 'border-accent-light shadow-[0_0_12px_rgba(124,58,237,0.3)] animate-skill-pulse'
  }

  return 'opacity-[0.92] saturate-[0.62] border-white/[0.12]'
}

export function nodeStatusLabel(node: SkillNode) {
  if (node.unlocked) {
    return 'Desbloqueado'
  }

  if (node.prerequisitesMet) {
    return 'Disponible'
  }

  return 'Bloqueado'
}

export const NODE_WIDTH = 164
export const NODE_HEIGHT = 112
export const GRID_GAP_X = 52
export const GRID_GAP_Y = 40
export const SCENE_PADDING = 40
export const MIN_SCALE = 0.6
export const MAX_SCALE = 2.2
export const VIEWPORT_PADDING = 28

export function pointForNode(node: SkillNode) {
  const x = SCENE_PADDING + node.col * (NODE_WIDTH + GRID_GAP_X)
  const y = SCENE_PADDING + node.row * (NODE_HEIGHT + GRID_GAP_Y)
  return { x, y }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function clampViewport(
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

export function fitViewport(canvas: HTMLDivElement | null, sceneWidth: number, sceneHeight: number) {
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
