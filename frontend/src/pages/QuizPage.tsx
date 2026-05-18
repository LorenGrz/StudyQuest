import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GameLayout } from '../components/Layouts'
import {
  ScoreHeader,
  QuestionCard,
  OptionsGrid,
  FeedbackOverlay,
} from '../components/QuizComponents'
import { Spinner, Button } from '../components/UI'
import { useQuiz } from '../hooks/useQuiz'
import { SkillUnlockToast } from '../components/SkillTreeComponents'

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
  } = useQuiz(questId ?? '')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  const handleAnswer = (optionId: string) => {
    setSelectedId(optionId)
    answer(optionId)
    setTimeout(() => setSelectedId(undefined), 2500)
  }

  if (isLoading) {
    return (
      <GameLayout>
        <div className="center-spinner"><Spinner size="lg" /></div>
      </GameLayout>
    )
  }

  if (loadError || !quest) {
    return (
      <GameLayout>
        <div className="quiz-finished">
          <div className="quiz-finished-icon">⚠️</div>
          <h1 className="quiz-finished-title">No se pudo abrir la quest</h1>
          <p>{loadError ?? 'La quest no está disponible en este momento.'}</p>
          <Button onClick={() => navigate(-1)}>Volver a la Party</Button>
        </div>
      </GameLayout>
    )
  }

  if (isFinished) {
    return (
      <GameLayout>
        <div className="quiz-finished">
          <div className="quiz-finished-icon">🏆</div>
          <h1 className="quiz-finished-title">¡Quest completada!</h1>
          <div className="quiz-leaderboard">
            <div className="leaderboard-item">
              <span className="leaderboard-rank">•</span>
              <span className="leaderboard-name">Puntaje del intento</span>
              <span className="leaderboard-score">{quest.latestAttempt?.score ?? quest.myLastScore ?? 0} pts</span>
            </div>
            <div className="leaderboard-item">
              <span className="leaderboard-rank">•</span>
              <span className="leaderboard-name">Aciertos</span>
              <span className="leaderboard-score">
                {quest.latestAttempt?.correctAnswers ?? 0}/{quest.questionCount ?? quest.questions.length}
              </span>
            </div>
            <div className="leaderboard-item">
              <span className="leaderboard-rank">•</span>
              <span className="leaderboard-name">Mejor puntaje</span>
              <span className="leaderboard-score">{quest.myBestScore ?? 0} pts</span>
            </div>
          </div>
          <div className="quiz-leaderboard">
            {quest?.leaderboard?.map((s, i) => (
              <div key={s.userId} className="leaderboard-item">
                <span className="leaderboard-rank">#{i + 1}</span>
                <span className="leaderboard-name">{s.username}</span>
                <span className="leaderboard-score">{s.score} pts</span>
              </div>
            ))}
          </div>
          <div className="upload-actions" style={{ marginTop: '16px' }}>
            <Button onClick={() => navigate(0)}>Volver a intentar</Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>Volver a la Party</Button>
          </div>
        </div>
      </GameLayout>
    )
  }

  return (
    <GameLayout>
      <div className="upload-actions" style={{ marginBottom: '12px', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={() => navigate(-1)}>← Volver</Button>
        {quest.myStatus === 'in_progress' && (
          <span className="text-small" style={{ color: 'var(--accent-light)' }}>Intento en curso</span>
        )}
      </div>
      <ScoreHeader
        scores={quest.leaderboard ?? []}
        timeLeft={timeLeft}
        currentIndex={currentIndex}
        total={quest.questionCount ?? quest.questions.length}
      />
      {currentQ && (
        <>
          <QuestionCard question={currentQ.text} category={currentQ.topic} />
          <OptionsGrid
            options={currentQ.options}
            onSelect={handleAnswer}
            disabled={!!result}
            correct={result?.correctIndex}
            selectedId={selectedId}
          />
        </>
      )}
      {result && (
        <FeedbackOverlay correct={result.isCorrect} explanation={result.explanation} />
      )}
      <SkillUnlockToast nodeNames={newlyUnlockedNames} onDismiss={clearNewlyUnlocked} />
    </GameLayout>
  )
}

export default QuizPage
