import { useState, useEffect, useCallback, useRef } from 'react'
import { questService, type Quest, type QuizQuestion, type AnswerResult } from '../services/questService'

const QUESTION_TIME_MS = 20000

export function useQuiz(questId: string) {
  const [quest, setQuest] = useState<Quest | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_MS / 1000)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFinished, setIsFinished] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!questId) return
    questService.getForPlay(questId).then((q) => {
      setQuest(q)
      setIsLoading(false)
    })
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

    const res = await questService.submitAnswer(currentQ.id, optionId, elapsedMs)
    setResult(res)

    // Avanzar a la siguiente pregunta tras 2 segundos
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

  return { quest, currentQ, answer, result, timeLeft, isLoading, isFinished, currentIndex }
}
