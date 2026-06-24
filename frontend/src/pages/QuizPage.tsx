import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GameLayout } from '../components/Layouts'
import {
  ScoreHeader,
  QuestionCard,
  OptionsGrid,
  FeedbackOverlay,
} from '../components/quiz/QuizComponents'
import { Spinner, Button } from '../components/UI'
import { useQuiz } from '../hooks/useQuiz'
import { SkillUnlockToast } from '../components/skill-tree/SkillTreeComponents'
import { motion, AnimatePresence } from 'framer-motion'

const QuizPage = () => {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const {
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
    clearNewlyUnlocked,
    nextQuestion,
  } = useQuiz(questId ?? '')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  const handleAnswer = (optionId: string) => {
    setSelectedId(optionId)
    answer(optionId)
  }

  const handleContinue = () => {
    setSelectedId(undefined)
    nextQuestion()
  }

  if (isLoading) {
    return (
      <GameLayout>
        <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
      </GameLayout>
    )
  }

  if (loadError || !quest) {
    return (
      <GameLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4 px-4 py-8 text-center max-w-lg mx-auto"
        >
          <div className="text-[56px] leading-none">⚠️</div>
          <h1 className="text-[22px] font-extrabold text-primary">No se pudo abrir la quest</h1>
          <p className="text-muted text-sm">{loadError ?? 'La quest no está disponible en este momento.'}</p>
          <Button onClick={() => navigate(-1)}>Volver a la Party</Button>
        </motion.div>
      </GameLayout>
    )
  }

  if (isFinished) {
    return (
      <GameLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, type: 'spring' }}
          className="flex flex-col items-center gap-4 px-4 py-8 text-center max-w-lg mx-auto"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.1, damping: 12 }}
            className="text-[56px] leading-none"
          >
            🏆
          </motion.div>
          <h1 className="text-[22px] font-extrabold text-primary">¡Quest completada!</h1>
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex items-center gap-3 px-3 py-2 bg-elevated rounded-lg">
              <span className="text-[11px] font-bold text-muted w-6 shrink-0">•</span>
              <span className="flex-1 text-[13px] text-primary truncate text-left">Puntaje del intento</span>
              <span className="text-[13px] font-bold text-accent-light shrink-0">{quest.latestAttempt?.score ?? quest.myLastScore ?? 0} pts</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-elevated rounded-lg">
              <span className="text-[11px] font-bold text-muted w-6 shrink-0">•</span>
              <span className="flex-1 text-[13px] text-primary truncate text-left">Aciertos</span>
              <span className="text-[13px] font-bold text-accent-light shrink-0">
                {quest.latestAttempt?.correctAnswers ?? 0}/{quest.questionCount ?? quest.questions.length}
              </span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-elevated rounded-lg">
              <span className="text-[11px] font-bold text-muted w-6 shrink-0">•</span>
              <span className="flex-1 text-[13px] text-primary truncate text-left">Mejor puntaje</span>
              <span className="text-[13px] font-bold text-accent-light shrink-0">{quest.myBestScore ?? 0} pts</span>
            </div>
          </div>
          {quest?.leaderboard?.length > 0 && (
            <div className="w-full flex flex-col gap-1.5 mt-1">
              {quest.leaderboard.map((s, i) => (
                <div key={s.userId} className="flex items-center gap-3 px-3 py-2 bg-elevated rounded-lg">
                  <span className="text-[11px] font-bold text-muted w-6 shrink-0">#{i + 1}</span>
                  <span className="flex-1 text-[13px] text-primary truncate text-left">{s.username}</span>
                  <span className="text-[13px] font-bold text-accent-light shrink-0">{s.score} pts</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 flex-wrap justify-center mt-2">
            <Button onClick={() => navigate(0)}>Volver a intentar</Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>Volver a la Party</Button>
          </div>
        </motion.div>
      </GameLayout>
    )
  }

  return (
    <GameLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col flex-1"
      >
        <div className="flex gap-2 justify-between items-center mb-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>← Volver</Button>
          {quest.myStatus === 'in_progress' && (
            <span className="text-sm" style={{ color: 'var(--accent-light)' }}>Intento en curso</span>
          )}
        </div>
        <ScoreHeader
          scores={quest.leaderboard ?? []}
          timeLeft={timeLeft}
          currentIndex={currentIndex}
          total={quest.questionCount ?? quest.questions.length}
        />
        <AnimatePresence mode="wait">
          {currentQ && (
            <motion.div
              key={currentQ.id || currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionCard question={currentQ.text} category={currentQ.topic} />
              <OptionsGrid
                options={currentQ.options}
                onSelect={handleAnswer}
                disabled={!!result}
                correct={result?.correctIndex}
                selectedId={selectedId}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {result && (
            <FeedbackOverlay
              correct={result.isCorrect}
              explanation={result.explanation}
              correctOptionLabel={result.correctIndex !== undefined ? ['A', 'B', 'C', 'D'][result.correctIndex] : undefined}
              correctOptionText={result.correctIndex !== undefined && currentQ ? currentQ.options[result.correctIndex]?.text : undefined}
              onContinue={handleContinue}
            />
          )}
        </AnimatePresence>
        <SkillUnlockToast nodeNames={newlyUnlockedNames} onDismiss={clearNewlyUnlocked} />
      </motion.div>
    </GameLayout>
  )
}

export default QuizPage
