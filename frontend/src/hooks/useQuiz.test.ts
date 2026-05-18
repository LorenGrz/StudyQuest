import { renderHook, waitFor } from '@testing-library/react'
import { useQuiz } from './useQuiz'
import { questService } from '../services/questService'

vi.mock('../services/questService', () => ({
  questService: {
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
  it('loads the real quest data through questService even in dev', async () => {
    vi.mocked(questService.getForPlay).mockResolvedValue({
      id: 'quest-1',
      partyId: 'party-1',
      subjectId: 'subject-1',
      title: 'Bases de datos',
      status: 'ready',
      leaderboard: [],
      questions: [],
      createdAt: new Date().toISOString(),
    } as any)

    const { result } = renderHook(() => useQuiz('quest-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(questService.getForPlay).toHaveBeenCalledWith('quest-1')
    expect(result.current.quest?.title).toBe('Bases de datos')
  })
})
