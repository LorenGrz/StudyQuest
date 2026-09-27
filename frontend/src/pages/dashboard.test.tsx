import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DashboardPage from './dashboard'
import { useAuthStore } from '../store/authStore'

// ─── Service mocks ────────────────────────────────────────────────────────────

// DashboardPage renders inside AppShell, which mounts the study-bot widget —
// stub its plan check so this test doesn't fire a real network request.
vi.mock('../services/billingService', () => ({
  billingService: { getState: vi.fn().mockResolvedValue({ limits: { studyBotEnabled: false } }) },
}))

vi.mock('../services/userService', () => ({
  userService: {
    getQuestsToday: vi.fn().mockResolvedValue([]),
    getRecommendedQuests: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 5, totalPages: 1 }),
    getGlobalLeaderboard: vi.fn().mockResolvedValue([]),
    getLeaderboard: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../services/partyService', () => ({
  partyService: {
    getMine: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../services/tournamentService', () => ({
  tournamentService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../services/searchService', () => ({
  searchService: {
    searchGlobal: vi.fn().mockResolvedValue({ totalResults: 0, quests: [], subjects: [], users: [] }),
  },
}))

vi.mock('../hooks/useUserSubjects', () => ({
  useUserSubjects: vi.fn().mockReturnValue({ subjects: [], isLoading: false }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: null,
  bio: null,
  university: 'UNC',
  career: 'Ingeniería en Sistemas de Información',
  year: 3,
  email: 'test@studyquest.dev',
  availability: [],
  enrolledSubjects: [],
  stats: {
    xp: 0,
    level: 1,
    elo: 1000,
    quizzesPlayed: 0,
    quizzesWon: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedAt: null,
  },
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardPage />
    </MemoryRouter>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  beforeEach(async () => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    })

    // Restore the happy-path defaults before every test: individual tests
    // below override these with rejections/custom payloads, and mocks aren't
    // reset automatically between tests in this file.
    const { userService } = await import('../services/userService')
    const { searchService } = await import('../services/searchService')
    vi.mocked(userService.getQuestsToday).mockResolvedValue([])
    vi.mocked(userService.getRecommendedQuests).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 5,
      totalPages: 1,
    })
    vi.mocked(searchService.searchGlobal).mockResolvedValue({
      totalResults: 0,
      quests: [],
      subjects: [],
      users: [],
    })
  })

  it('shows a friendly retry state instead of the raw backend error', async () => {
    const { userService } = await import('../services/userService')
    vi.mocked(userService.getQuestsToday).mockRejectedValue(new Error('Internal server error'))

    renderDashboard()

    expect(await screen.findByText('No pudimos cargar tus quests')).toBeInTheDocument()
    expect(screen.queryByText('Internal server error')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('starts the Recomendados section collapsed and shows the total in the header', async () => {
    const { userService } = await import('../services/userService')
    vi.mocked(userService.getRecommendedQuests).mockResolvedValue({
      items: [],
      total: 12,
      page: 1,
      limit: 5,
      totalPages: 3,
    })

    renderDashboard()

    const toggle = await screen.findByRole('button', { name: /recomendados/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent('12')
  })

  it('shows the search listbox after typing at least 2 characters and closes it on Escape', async () => {
    renderDashboard()

    const input = screen.getByRole('combobox', { name: /buscar usuarios, materias y quests/i })
    fireEvent.change(input, { target: { value: 'ma' } })

    expect(await screen.findByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('reloads the current page when Reintentar is clicked in Recomendados', async () => {
    const { userService } = await import('../services/userService')
    vi.mocked(userService.getRecommendedQuests).mockRejectedValue(new Error('Internal server error'))

    renderDashboard()

    const retryButton = await screen.findByRole('button', { name: 'Reintentar' })
    const callsBeforeRetry = vi.mocked(userService.getRecommendedQuests).mock.calls.length

    vi.mocked(userService.getRecommendedQuests).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 5,
      totalPages: 1,
    })
    fireEvent.click(retryButton)

    await waitFor(() =>
      expect(vi.mocked(userService.getRecommendedQuests).mock.calls.length).toBeGreaterThan(callsBeforeRetry),
    )
    const lastCall = vi.mocked(userService.getRecommendedQuests).mock.calls.at(-1)
    expect(lastCall?.[0]).toBe(1)
  })
})
