import { useCallback, useEffect, useState } from 'react'
import { skillTreeService, type SkillNode } from '../services/skillTreeService'

export function useSkillTree(subjectId: string) {
  const [nodes, setNodes] = useState<SkillNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!subjectId) {
      setNodes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const tree = await skillTreeService.getTree(subjectId)
      setNodes(tree)
    } catch {
      setError('No se pudo cargar el arbol de habilidades')
    } finally {
      setIsLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    load()
  }, [load])

  return {
    nodes,
    isLoading,
    error,
    reload: load,
  }
}
