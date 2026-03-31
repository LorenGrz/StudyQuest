import type { Quest, QuizQuestion, QuizOption, AnswerResult } from '../services/questService'

// ─── ScoreHeader ─────────────────────────────────────────────────────────────
interface ScoreHeaderProps {
  scores: Quest['leaderboard']
  timeLeft: number
  currentIndex: number
  total: number
}

export function ScoreHeader({ scores, timeLeft, currentIndex, total }: ScoreHeaderProps) {
  const timerPct = (timeLeft / 20) * 100
  const timerColor = timeLeft > 10 ? '#10b981' : timeLeft > 5 ? '#f59e0b' : '#ef4444'

  return (
    <div className="score-header">
      <div className="score-progress">
        Pregunta {currentIndex + 1} / {total}
      </div>
      <div className="score-timer-ring">
        <svg viewBox="0 0 36 36" className="timer-svg">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e1e2e" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={timerColor} strokeWidth="3"
            strokeDasharray={`${timerPct} ${100 - timerPct}`}
            strokeDashoffset="25"
            style={{ transition: 'stroke-dasharray 0.2s' }}
          />
        </svg>
        <span className="timer-text">{timeLeft}</span>
      </div>
      <div className="score-top">
        {scores.slice(0, 3).map((s, i) => (
          <div key={s.userId} className="score-item">
            <span className="score-rank">#{i + 1}</span>
            <span className="score-name">{s.username}</span>
            <span className="score-pts">{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────
export function QuestionCard({ question, category }: { question: string; category: string }) {
  return (
    <div className="question-card">
      <span className="question-category">{category}</span>
      <p className="question-text">{question}</p>
    </div>
  )
}

// ─── OptionsGrid ─────────────────────────────────────────────────────────────
interface OptionsGridProps {
  options: QuizOption[]
  onSelect: (optionId: string) => void
  disabled: boolean
  correct?: number
  selectedId?: string
}

const optionColors = ['#7c3aed', '#2563eb', '#059669', '#d97706']
const optionLabels = ['A', 'B', 'C', 'D']

export function OptionsGrid({ options, onSelect, disabled, correct, selectedId }: OptionsGridProps) {
  return (
    <div className="options-grid">
      {options.map((opt, i) => {
        const isCorrect = correct !== undefined && i === correct
        const isSelected = selectedId === opt.id
        return (
          <button
            key={opt.id}
            className={`option-btn ${isCorrect ? 'option-correct' : ''} ${isSelected && !isCorrect ? 'option-wrong' : ''}`}
            style={{ '--opt-color': optionColors[i] } as React.CSSProperties}
            onClick={() => !disabled && onSelect(opt.id)}
            disabled={disabled}
          >
            <span className="option-label">{optionLabels[i]}</span>
            <span className="option-text">{opt.text}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── FeedbackOverlay ─────────────────────────────────────────────────────────
export function FeedbackOverlay({ correct, explanation }: { correct: boolean; explanation: string }) {
  return (
    <div className={`feedback-overlay ${correct ? 'feedback-correct' : 'feedback-wrong'}`}>
      <div className="feedback-icon">{correct ? '✅' : '❌'}</div>
      <p className="feedback-title">{correct ? '¡Correcto!' : 'Incorrecto'}</p>
      <p className="feedback-explanation">{explanation}</p>
    </div>
  )
}
