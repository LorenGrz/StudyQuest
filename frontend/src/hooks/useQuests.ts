import { useState, useEffect, useCallback } from 'react'
import { AxiosError } from 'axios'
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
    file?: File,
    textContent?: string,
  ) => {
    setIsGenerating(true)
    try {
      const quest = await questService.create(
        { partyId, title, textContent },
        file,
      )
      setQuests((prev) => [quest, ...prev])
      return quest
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message
        if (Array.isArray(message) && message.length > 0) {
          throw new Error(message[0])
        }
        if (typeof message === 'string' && message.trim()) {
          throw new Error(message)
        }
      }
      throw new Error('No se pudo generar la quest')
    } finally {
      setIsGenerating(false)
    }
  }, [partyId])

  return { quests, isLoading, isGenerating, uploadNote, refresh: load }
}
