import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MatchPage from './MatchPage'
import { useAuthStore } from '../store/authStore'
import { useMatch } from '../hooks/useMatch'

const navigate = vi.fn()
const joinSpy = vi.fn()
const loadSpy = vi.fn()
const discardSpy = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../hooks/useMatch', () => ({
  useMatch: vi.fn(),
}))

const user = {
  id: 'user-1',
  username: 'alice_dev',
  displayName: 'Alice Garcia',
  avatarUrl: null,
  university: 'UNC',
  career: 'ISI',
  semester: 4,
  email: 'alice@studyquest.dev',
  availability: [],
  enrolledSubjects: [
    { id: 'subject-1', name: 'Algoritmos y Estructuras de Datos', code: 'AED', career: 'ISI', university: 'UNC', semester: 3 },
  ],
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

const party = {
  id: 'party-1',
  subjectId: 'subject-1',
  subject: { id: 'subject-1', name: 'Algoritmos y Estructuras de Datos', code: 'AED' },
  members: [{
    id: 'member-1',
    userId: 'user-2',
    partyXp: 0,
    isOnline: true,
    joinedAt: '',
    role: 'leader',
    user: {
      id: 'user-2',
      username: 'bob_dev',
      displayName: 'Bob Martinez',
      avatarUrl: null,
      stats: user.stats,
    },
  }],
  maxMembers: 4,
  status: 'forming',
  quests: [{ id: 'quest-1', title: 'Repaso AED', status: 'active' }],
  isPrivate: false,
  createdAt: '',
  updatedAt: '',
} as any

describe('MatchPage', () => {
  beforeEach(() => {
    navigate.mockReset()
    joinSpy.mockReset()
    loadSpy.mockReset()
    discardSpy.mockReset()
    useAuthStore.setState({
      user,
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    })

    vi.mocked(useMatch).mockReturnValue({
      parties: [party],
      top: party,
      status: 'ready',
      error: null,
      load: loadSpy,
      discard: discardSpy,
      join: joinSpy.mockResolvedValue(party),
    } as any)
  })

  it('shows the REST discovery card without queue confirmation copy', () => {
    render(
      <MemoryRouter initialEntries={['/match']}>
        <MatchPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/party discovery/i)).toBeInTheDocument()
    expect(screen.getAllByText(/algoritmos y estructuras de datos/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/esperando confirmaciones/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/persona en cola/i)).not.toBeInTheDocument()
  })

  it('joins the visible party and navigates to the party room', async () => {
    render(
      <MemoryRouter initialEntries={['/match']}>
        <MatchPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /unirse/i }))

    await waitFor(() => {
      expect(joinSpy).toHaveBeenCalledWith('party-1')
      expect(navigate).toHaveBeenCalledWith('/party/party-1')
    })
  })
})
