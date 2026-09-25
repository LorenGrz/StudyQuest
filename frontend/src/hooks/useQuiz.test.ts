import { renderHook, waitFor } from '@testing-library/react'
import { useQuiz } from './useQuiz'
import { questService } from '../services/questService'

vi.mock('../services/questService', () => ({
  questService: {
    start: vi.fn(),
    getForPlay: vi.fn(),
    submitAnswer: vi.fn(),
    complete: vi.fn(),
  },
}))

vi.mock('../services/skillTreeService', () => ({
  skillTreeService: {
    getTree: vi.fn(),
  },
}))

describe('useQuiz', () => {
  it('starts or resumes the real quest attempt before rendering the quiz', async () => {
    vi.mocked(questService.start).mockResolvedValue({
      id: 'attempt-1',
      attemptNumber: 1,
      status: 'in_progress',
      answeredQuestionIndices: [0, 1],
      resumed: true,
      score: 120,
      correctAnswers: 2,
      totalQuestions: 3,
      currentIndex: 2,
    } as any)
    vi.mocked(questService.getForPlay).mockResolvedValue({
      id: 'quest-1',
      partyId: 'party-1',
      subjectId: 'subject-1',
      title: 'Transacciones ACID',
      status: 'completed',
      myBestScore: 450,
      myLastScore: 450,
      activeAttempt: {
        id: 'attempt-1',
        currentIndex: 2,
        answeredQuestionIndices: [0, 1],
      },
      leaderboard: [],
      questions: [
        { id: 'q1', text: 'Q1', topic: 'ACID', options: [], order: 0 },
        { id: 'q2', text: 'Q2', topic: 'ACID', options: [], order: 1 },
        { id: 'q3', text: 'Q3', topic: 'ACID', options: [], order: 2 },
      ],
      createdAt: new Date().toISOString(),
    } as any)

    const { result } = renderHook(() => useQuiz('quest-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(questService.start).toHaveBeenCalledWith('quest-1')
    expect(questService.getForPlay).toHaveBeenCalledWith('quest-1')
    expect(result.current.quest?.title).toBe('Transacciones ACID')
    expect(result.current.currentIndex).toBe(2)
  })
})
