import { render, screen } from '@testing-library/react'
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
    getRecommendedQuests: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }),
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
} as any

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardPage />
    </MemoryRouter>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
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
})
