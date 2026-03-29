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

const QuizPage = () => {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const { quest, currentQ, answer, result, timeLeft, isLoading, isFinished, currentIndex } =
    useQuiz(questId ?? '')
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

  if (isFinished || !quest) {
    return (
      <GameLayout>
        <div className="quiz-finished">
          <div className="quiz-finished-icon">🏆</div>
          <h1 className="quiz-finished-title">¡Quest completada!</h1>
          <div className="quiz-leaderboard">
            {quest?.leaderboard?.map((s, i) => (
              <div key={s.userId} className="leaderboard-item">
                <span className="leaderboard-rank">#{i + 1}</span>
                <span className="leaderboard-name">{s.username}</span>
                <span className="leaderboard-score">{s.score} pts</span>
              </div>
            ))}
          </div>
          <Button onClick={() => navigate(-1)}>Volver a la Party</Button>
        </div>
      </GameLayout>
    )
  }

  return (
    <GameLayout>
      <ScoreHeader
        scores={quest.leaderboard ?? []}
        timeLeft={timeLeft}
        currentIndex={currentIndex}
        total={quest.questions.length}
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
    </GameLayout>
  )
}

export default QuizPage
