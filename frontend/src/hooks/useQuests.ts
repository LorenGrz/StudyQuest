import { useState, useEffect, useCallback } from 'react'
import { questService, type Quest } from '../services/questService'

export function useQuests(partyId: string) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const load = useCallback(async () => {
    if (!partyId) return
    setIsLoading(true)
    try {
      const data = await questService.findByParty(partyId)
      setQuests(data)
    } finally {
      setIsLoading(false)
    }
  }, [partyId])

  useEffect(() => { load() }, [load])

  const uploadNote = useCallback(async (
    title: string,
    subjectId: string,
    file?: File,
    noteText?: string,
  ) => {
    setIsGenerating(true)
    try {
      const quest = await questService.create(
        { partyId, title, subjectId, noteText },
        file,
      )
      setQuests((prev) => [quest, ...prev])
    } finally {
      setIsGenerating(false)
    }
  }, [partyId])

  return { quests, isLoading, isGenerating, uploadNote, refresh: load }
}
