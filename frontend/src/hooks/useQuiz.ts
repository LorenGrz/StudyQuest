import { useState, useEffect, useCallback, useRef } from 'react'
import { AxiosError } from 'axios'
import { questService, type Quest, type QuizQuestion, type AnswerResult } from '../services/questService'
import { skillTreeService } from '../services/skillTreeService'

const QUESTION_TIME_MS = 10000

export function useQuiz(questId: string) {
  const [quest, setQuest] = useState<Quest | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [attemptId, setAttemptId] = useState('')
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_MS / 1000)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [newlyUnlockedNames, setNewlyUnlockedNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFinished, setIsFinished] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  // Guards against double-submit (e.g. a click landing the same instant the timer expires).
  const lockRef = useRef(false)
  const currentQ: QuizQuestion | null = quest?.questions[currentIndex] ?? null

  useEffect(() => {
    if (!questId) return

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const startedAttempt = await questService.start(questId)
        const q = await questService.getForPlay(questId)
        if (cancelled) return
        setAttemptId(startedAttempt.id)
        setQuest(q)
        setCurrentIndex(q.activeAttempt?.currentIndex ?? startedAttempt.currentIndex ?? 0)
        setIsFinished(false)
      } catch (error) {
        if (cancelled) return

        if (error instanceof AxiosError) {
          const message = error.response?.data?.message
          const text = Array.isArray(message) ? message[0] : message

          if (typeof text === 'string' && /generating|estado: generating|no disponible/i.test(text)) {
            setLoadError('La quest se está generando con IA. Volvé a la party y esperá unos segundos.')
          } else if (typeof text === 'string' && text.trim()) {
            setLoadError(text)
          } else {
            setLoadError('No se pudo cargar la quest.')
          }
          return
        }

        setLoadError('No se pudo cargar la quest.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [questId])

  // Envía una selección (opción real, o -1 si se agotó el tiempo) y avanza tras una pausa.
  const submitSelection = useCallback(async (selectedOption: number) => {
    if (!currentQ || !attemptId || lockRef.current) return
    lockRef.current = true
    clearInterval(timerRef.current!)
    const elapsedMs = Date.now() - startTimeRef.current

    const res = await questService.submitAnswer(
      questId,
      attemptId,
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

    setTimeout(async () => {
      setResult(null)
      if (quest && currentIndex + 1 < quest.questions.length) {
        setCurrentIndex((i) => i + 1)
      } else {
        const completedQuest = await questService.complete(questId)
        setQuest(completedQuest)
        setAttemptId('')
        setIsFinished(true)
      }
      lockRef.current = false
    }, 2500)
  }, [attemptId, currentQ, currentIndex, quest, questId])

  // Latest submit fn for the timer interval, without re-arming the timer on every change.
  const submitRef = useRef(submitSelection)
  submitRef.current = submitSelection

  const answer = useCallback((optionId: string) => {
    const selectedOption = currentQ?.options.findIndex((option) => option.id === optionId) ?? -1
    if (selectedOption < 0) return
    void submitSelection(selectedOption)
  }, [currentQ, submitSelection])

  // Timer por pregunta — al llegar a 0 envía -1 (sin respuesta) y salta a la siguiente.
  useEffect(() => {
    if (!quest || isFinished || !currentQ) return
    lockRef.current = false
    setTimeLeft(QUESTION_TIME_MS / 1000)
    startTimeRef.current = Date.now()

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, QUESTION_TIME_MS - elapsed)
      setTimeLeft(Math.ceil(remaining / 1000))
      if (remaining === 0) {
        clearInterval(timerRef.current!)
        void submitRef.current(-1)
      }
    }, 200)

    return () => clearInterval(timerRef.current!)
  }, [currentIndex, quest, isFinished, currentQ])

  return {
    quest,
    currentQ,
    answer,
    result,
    timeLeft,
    isLoading,
    isFinished,
    currentIndex,
    loadError,
    newlyUnlockedNames,
    clearNewlyUnlocked: () => setNewlyUnlockedNames([]),
  }
}
