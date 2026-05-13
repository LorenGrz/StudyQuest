import { useState, useEffect, useCallback, useRef } from 'react'
import { questService, type Quest, type QuizQuestion, type AnswerResult } from '../services/questService'
import { skillTreeService } from '../services/skillTreeService'

const QUESTION_TIME_MS = 20000

export function useQuiz(questId: string) {
  const [quest, setQuest] = useState<Quest | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_MS / 1000)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [newlyUnlockedNames, setNewlyUnlockedNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFinished, setIsFinished] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!questId) return

    if (import.meta.env.DEV) {
      // Mock temporal — sacar cuando el backend esté listo
      import('../services/mock/questService.mock').then(({ mockQuest }) => {
        setQuest(mockQuest)
        setIsLoading(false)
      })
      return
    }

    questService.getForPlay(questId)
      .then((q) => { setQuest(q); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [questId])

  // Timer por pregunta
  useEffect(() => {
    if (!quest || isFinished) return
    setTimeLeft(QUESTION_TIME_MS / 1000)
    startTimeRef.current = Date.now()

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, QUESTION_TIME_MS - elapsed)
      setTimeLeft(Math.ceil(remaining / 1000))
      if (remaining === 0) clearInterval(timerRef.current!)
    }, 200)

    return () => clearInterval(timerRef.current!)
  }, [currentIndex, quest, isFinished])

  const currentQ: QuizQuestion | null = quest?.questions[currentIndex] ?? null

  const answer = useCallback(async (optionId: string) => {
    if (!currentQ || result) return
    clearInterval(timerRef.current!)
    const elapsedMs = Date.now() - startTimeRef.current
    const selectedOption = currentQ.options.findIndex((option) => option.id === optionId)
    if (selectedOption < 0) return

    if (import.meta.env.DEV) {
      // Mock temporal — sacar cuando el backend esté listo
      const { mockAnswerResult } = await import('../services/mock/questService.mock')
      const correctId = currentQ.options[2].id  // asume correctIndex=2 para el mock
      const res = mockAnswerResult(optionId, correctId)
      setResult(res)
      setNewlyUnlockedNames([])
      setTimeout(() => {
        setResult(null)
        if (quest && currentIndex + 1 < quest.questions.length) {
          setCurrentIndex((i) => i + 1)
        } else {
          setIsFinished(true)
        }
      }, 2500)
      return
    }

    const res = await questService.submitAnswer(
      questId,
      currentIndex,
      selectedOption,
      elapsedMs,
    )

    if (quest?.subjectId && res.newlyUnlockedNodeIds?.length) {
      try {
        const tree = await skillTreeService.getTree(quest.subjectId)
        const names = tree
          .filter((node) => res.newlyUnlockedNodeIds?.includes(node.id))
          .map((node) => node.name)
        setNewlyUnlockedNames(names)
      } catch {
        setNewlyUnlockedNames(['Nueva habilidad'])
      }
    } else {
      setNewlyUnlockedNames([])
    }

    setResult(res)

    setTimeout(() => {
      setResult(null)
      if (quest && currentIndex + 1 < quest.questions.length) {
        setCurrentIndex((i) => i + 1)
      } else {
        setIsFinished(true)
        questService.complete(questId)
      }
    }, 2500)
  }, [currentQ, result, currentIndex, quest, questId])

  return {
    quest,
    currentQ,
    answer,
    result,
    timeLeft,
    isLoading,
    isFinished,
    currentIndex,
    newlyUnlockedNames,
    clearNewlyUnlocked: () => setNewlyUnlockedNames([]),
  }
}