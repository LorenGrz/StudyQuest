import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeaderboardPage from './LeaderboardPage'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'

// LeaderboardPage renders inside AppShell, which mounts the study-bot widget —
// stub its plan check so this test doesn't fire a real network request.
vi.mock('../services/billingService', () => ({
  billingService: { getState: vi.fn().mockResolvedValue({ limits: { studyBotEnabled: false } }) },
}))

vi.mock('../services/userService', () => ({
  userService: {
    getGlobalLeaderboard: vi.fn(),
    getLeaderboard: vi.fn(),
    getLeaderboardUniversities: vi.fn(),
    getMyLeaderboardPosition: vi.fn(),
  },
}))

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: null,
  university: 'Universidad de Buenos Aires',
  career: 'Ingeniería en Sistemas de Información',
  year: 3,
  email: 'test@studyquest.dev',
  availability: [],
  enrolledSubjects: [{ id: 'subj-1', name: 'Álgebra', code: 'ALG1', career: 'Ingeniería', university: 'UBA', year: 1 }],
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

const entries = [
  {
    rank: 1,
    userId: 'other-1',
    username: 'top',
    displayName: 'Top Player',
    avatarUrl: null,
    elo: 2000,
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>,
  )
}

describe('LeaderboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    })
    vi.mocked(userService.getGlobalLeaderboard).mockResolvedValue(entries)
    vi.mocked(userService.getLeaderboard).mockResolvedValue(entries)
    vi.mocked(userService.getLeaderboardUniversities).mockResolvedValue(['Universidad de Buenos Aires', 'UTN'])
    vi.mocked(userService.getMyLeaderboardPosition).mockResolvedValue({ rank: 12, elo: 1000, total: 40 })
  })

  it('loads the Global tab by default', async () => {
    renderPage()
    expect(await screen.findByText('Top Player')).toBeInTheDocument()
    expect(userService.getGlobalLeaderboard).toHaveBeenCalledWith(20)
  })

  it('switches to Por universidad and defaults the selector to the user own university', async () => {
    renderPage()
    await screen.findByText('Top Player')

    fireEvent.click(screen.getByRole('tab', { name: 'Por universidad' }))

    const select = await screen.findByLabelText('Universidad')
    expect(select).toHaveValue('Universidad de Buenos Aires')
    await waitFor(() => {
      expect(userService.getGlobalLeaderboard).toHaveBeenCalledWith(20, 'Universidad de Buenos Aires')
    })
  })

  it('refetches when the university selector changes', async () => {
    renderPage()
    await screen.findByText('Top Player')
    fireEvent.click(screen.getByRole('tab', { name: 'Por universidad' }))
    const select = await screen.findByLabelText('Universidad')

    fireEvent.change(select, { target: { value: 'UTN' } })

    await waitFor(() => {
      expect(userService.getGlobalLeaderboard).toHaveBeenCalledWith(20, 'UTN')
    })
  })

  it('switches to Por materia and lists the enrolled subjects', async () => {
    renderPage()
    await screen.findByText('Top Player')

    fireEvent.click(screen.getByRole('tab', { name: 'Por materia' }))

    await waitFor(() => {
      expect(userService.getLeaderboard).toHaveBeenCalledWith('subj-1', 20)
    })
    expect(screen.getByText('Álgebra')).toBeInTheDocument()
  })

  it("shows the caller's own position when they're outside the visible top", async () => {
    renderPage()
    expect(await screen.findByText('Tu posición: #12')).toBeInTheDocument()
  })

  it('shows a friendly error when the leaderboard fails to load', async () => {
    vi.mocked(userService.getGlobalLeaderboard).mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText('No se pudo cargar el leaderboard')).toBeInTheDocument()
  })
})
