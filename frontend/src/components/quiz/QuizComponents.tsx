import type { Quest, QuizOption } from '../../services/questService'

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
    <div className="bg-surface px-4 py-3 flex flex-col gap-2 border-b border-[var(--overlay-border)]">
      <div className="text-xs font-semibold text-muted text-center uppercase tracking-[0.5px]">
        Pregunta {currentIndex + 1} / {total}
      </div>
      <div className="w-[52px] h-[52px] relative mx-auto flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e1e2e" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={timerColor} strokeWidth="3"
            strokeDasharray={`${timerPct} ${100 - timerPct}`}
            strokeDashoffset="25"
            style={{ transition: 'stroke-dasharray 0.2s' }}
          />
        </svg>
        <span className="text-base font-extrabold relative z-[1]">{timeLeft}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {scores.slice(0, 3).map((s, i) => (
          <div key={s.userId} className="flex items-center gap-1.5 bg-elevated rounded-[12px] px-2.5 py-1.5 whitespace-nowrap text-xs">
            <span className="font-bold text-accent-light">#{i + 1}</span>
            <span className="text-primary">{s.username}</span>
            <span className="font-bold text-warning">{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────
export function QuestionCard({ question, category }: { question: string; category: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <span className="inline-block bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] rounded-full px-3.5 py-1 text-[11px] font-semibold text-accent-light uppercase tracking-[0.5px] mb-3.5">{category}</span>
      <p className="text-xl font-bold leading-[1.4]">{question}</p>
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
    <div className="grid grid-cols-2 gap-2.5 p-4">
      {options.map((opt, i) => {
        const isCorrect = correct !== undefined && i === correct
        const isSelected = selectedId === opt.id
        return (
          <button
            key={opt.id}
            className={`flex items-center gap-2.5 px-3 py-3.5 bg-white/[0.04] border border-[var(--overlay-border)] rounded-[18px] text-left transition-all duration-150 text-primary text-sm font-medium cursor-pointer hover:enabled:bg-elevated hover:enabled:scale-[1.02] disabled:cursor-not-allowed${isCorrect ? ' !bg-[rgba(16,185,129,0.1)] !border-success' : ''}${isSelected && !isCorrect ? ' !bg-[rgba(239,68,68,0.1)] !border-danger' : ''}`}
            style={{ '--opt-color': optionColors[i] } as React.CSSProperties}
            onClick={() => !disabled && onSelect(opt.id)}
            disabled={disabled}
          >
            <span className="w-7 h-7 rounded-[8px] bg-[var(--opt-color,var(--color-accent))] flex items-center justify-center font-extrabold text-[13px] shrink-0">{optionLabels[i]}</span>
            <span className="text-[13px] leading-[1.3]">{opt.text}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── FeedbackOverlay ─────────────────────────────────────────────────────────
export function FeedbackOverlay({ correct, explanation }: { correct: boolean; explanation: string }) {
  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center gap-3 text-center p-8 animate-slide-up z-[100] ${correct ? 'bg-[rgba(16,185,129,0.9)]' : 'bg-[rgba(239,68,68,0.9)]'}`}>
      <div className="text-[56px]">{correct ? '✅' : '❌'}</div>
      <p className="text-[28px] font-extrabold text-primary">{correct ? '¡Correcto!' : 'Incorrecto'}</p>
      <p className="text-[15px] text-secondary max-w-[300px] leading-[1.5]">{explanation}</p>
    </div>
  )
}
