import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditProfileModal } from './EditProfileModal'
import { userService, type User } from '../../services/userService'
import { universityService } from '../../services/universityService'

vi.mock('../../services/userService', async () => {
  const actual = await vi.importActual<typeof import('../../services/userService')>(
    '../../services/userService',
  )
  return {
    ...actual,
    userService: { ...actual.userService, updateMe: vi.fn() },
  }
})

vi.mock('../../services/universityService', () => ({
  universityService: { getMyCareerRequests: vi.fn().mockResolvedValue([]) },
}))

const universities = [
  { id: 'uni-uba', name: 'Universidad de Buenos Aires', shortName: 'UBA', website: null },
  { id: 'uni-utn', name: 'Universidad Tecnológica Nacional', shortName: 'UTN', website: null },
]

const careersByUniversity: Record<string, Array<{ id: string; universityId: string; name: string; faculty: string | null; level: 'grado' }>> = {
  'uni-uba': [
    { id: 'car-uba-1', universityId: 'uni-uba', name: 'Ingeniería en Informática', faculty: 'Ingeniería', level: 'grado' },
  ],
}

vi.mock('../../hooks/useUniversities', () => ({
  useUniversities: () => ({ universities, isLoading: false }),
  useUniversityCareers: (universityId?: string) => {
    const careers = universityId ? careersByUniversity[universityId] ?? [] : []
    return {
      careers,
      groups: careers.length ? [{ faculty: careers[0].faculty ?? 'Sin facultad', careers }] : [],
      isLoading: false,
    }
  },
}))

const baseUser: User = {
  id: 'u1',
  email: 'ana@uba.ar',
  username: 'anadev',
  displayName: 'Ana Dev',
  avatarUrl: null,
  bio: null,
  university: 'Universidad de Buenos Aires',
  career: 'Ingeniería en Informática',
  universityId: 'uni-uba',
  careerId: 'car-uba-1',
  pendingCareerRequestId: null,
  role: 'USER',
  year: 3,
  enrolledSubjects: [],
  availability: [],
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

describe('EditProfileModal', () => {
  beforeEach(() => {
    vi.mocked(userService.updateMe).mockReset()
    vi.mocked(universityService.getMyCareerRequests).mockReset()
    vi.mocked(universityService.getMyCareerRequests).mockResolvedValue([])
  })

  it('is prefilled from the user and saves the profile', async () => {
    const updated = { ...baseUser, displayName: 'Ana Updated' }
    vi.mocked(userService.updateMe).mockResolvedValue(updated)
    const onUpdate = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<EditProfileModal user={baseUser} onClose={onClose} onUpdate={onUpdate} />)

    expect(screen.getByLabelText('Universidad')).toHaveValue('uni-uba')
    expect(screen.getByLabelText('Carrera')).toHaveValue('Ingeniería en Informática')

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(userService.updateMe).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'Ana Dev',
          universityId: 'uni-uba',
          careerId: 'car-uba-1',
          year: 3,
        }),
      )
    })
    expect(onUpdate).toHaveBeenCalledWith(updated)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the pending career badge with the name from /career-requests/mine', async () => {
    const pendingUser: User = {
      ...baseUser,
      career: '',
      careerId: null,
      pendingCareerRequestId: 'req-1',
    }
    vi.mocked(universityService.getMyCareerRequests).mockResolvedValue([
      {
        id: 'req-1',
        name: 'Bioingeniería',
        status: 'pending',
        universityId: 'uni-uba',
        careerId: null,
        adminNote: null,
        createdAt: '',
        resolvedAt: null,
      },
    ])

    render(<EditProfileModal user={pendingUser} onClose={() => {}} onUpdate={() => {}} />)

    expect(
      await screen.findByText('Carrera pendiente de aprobación: «Bioingeniería»'),
    ).toBeInTheDocument()
  })
})
