import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import SubjectExplorerPage from './SubjectExplorerPage'
import { subjectService, type CommunitySubject } from '../services/subjectService'
import { userService, type User } from '../services/userService'
import { useAuthStore } from '../store/authStore'

// SubjectExplorerPage renders inside AppShell, which mounts the study-bot
// widget — stub its plan check so this test doesn't fire a real network
// request (same stub as dashboard.test.tsx / LeaderboardPage.test.tsx).
vi.mock('../services/billingService', () => ({
  billingService: { getState: vi.fn().mockResolvedValue({ limits: { studyBotEnabled: false } }) },
}))

vi.mock('../services/subjectService', () => ({
  subjectService: {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    getCareers: vi.fn().mockResolvedValue([]),
    suggest: vi.fn().mockResolvedValue([]),
    createCommunity: vi.fn(),
    reportSubject: vi.fn(),
  },
}))

vi.mock('../services/userService', async () => {
  const actual = await vi.importActual<typeof import('../services/userService')>(
    '../services/userService',
  )
  return {
    ...actual,
    userService: {
      ...actual.userService,
      getMe: vi.fn(),
      enrollSubject: vi.fn().mockResolvedValue(undefined),
      unenrollSubject: vi.fn().mockResolvedValue(undefined),
    },
  }
})

const baseUser: User = {
  id: 'u1',
  email: 'ana@uba.ar',
  username: 'anadev',
  displayName: 'Ana Dev',
  avatarUrl: null,
  bio: null,
  university: 'Universidad de Buenos Aires',
  career: 'Ingeniería en Informática',
  universityId: 'uni-1',
  careerId: 'car-1',
  pendingCareerRequestId: null,
  role: 'USER',
  year: 3,
  enrolledSubjects: [
    { id: 'enr-1', name: 'Álgebra', code: 'ALG1', career: 'Ingeniería', university: 'UBA', year: 1 },
  ],
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

function makeCommunitySubject(overrides: Partial<CommunitySubject> = {}): CommunitySubject {
  return {
    id: 'subj-1',
    name: 'Análisis I',
    code: null,
    year: null,
    universityId: 'uni-1',
    careerId: null,
    source: 'community',
    visibility: 'university',
    status: 'active',
    enrolledCount: 1,
    enrolled: false,
    createdByMe: false,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SubjectExplorerPage />
    </MemoryRouter>,
  )
}

describe('SubjectExplorerPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: baseUser,
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    })
    vi.mocked(subjectService.findAll).mockReset().mockResolvedValue([])
    vi.mocked(subjectService.suggest).mockReset().mockResolvedValue([])
    vi.mocked(subjectService.createCommunity).mockReset()
    vi.mocked(subjectService.reportSubject).mockReset()
    vi.mocked(userService.getMe).mockReset().mockResolvedValue(baseUser)
    vi.mocked(userService.enrollSubject).mockReset().mockResolvedValue(undefined)
    vi.mocked(userService.unenrollSubject).mockReset().mockResolvedValue(undefined)
  })

  it('renders official and private badges for suggested subjects', async () => {
    vi.mocked(subjectService.suggest).mockResolvedValue([
      makeCommunitySubject({ id: 'off-1', name: 'Análisis I', source: 'official', visibility: 'university' }),
      makeCommunitySubject({ id: 'priv-1', name: 'Taller de Tesis', source: 'community', visibility: 'private', createdByMe: true }),
    ])
    renderPage()

    fireEvent.change(screen.getByLabelText('Agregar materia'), { target: { value: 'anal' } })

    expect(await screen.findByText('Análisis I')).toBeInTheDocument()
    expect(screen.getByText('Oficial')).toBeInTheDocument()
    expect(screen.getByText('Taller de Tesis')).toBeInTheDocument()
    expect(screen.getByText('Privada')).toBeInTheDocument()
  })

  it('calls create when "Agregar «x» como materia nueva" is clicked', async () => {
    vi.mocked(subjectService.createCommunity).mockResolvedValue({
      outcome: 'created',
      subject: makeCommunitySubject({ id: 'new-1', name: 'Taller de Tesis', visibility: 'private' }),
    })
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(screen.getByLabelText('Agregar materia'), { target: { value: 'Taller de Tesis' } })
    const addButton = await screen.findByRole('button', {
      name: 'Agregar «Taller de Tesis» como materia nueva',
    })
    await user.click(addButton)

    await waitFor(() => {
      expect(subjectService.createCommunity).toHaveBeenCalledWith({
        name: 'Taller de Tesis',
        force: undefined,
      })
    })
  })

  it('offers to enroll a suggestion when create answers 409 SIMILAR_SUBJECTS', async () => {
    const similar = makeCommunitySubject({ id: 'sim-1', name: 'Análisis Matemático I' })
    vi.mocked(subjectService.createCommunity).mockRejectedValue({
      response: {
        status: 409,
        data: {
          code: 'SIMILAR_SUBJECTS',
          message: '¿Quisiste decir alguna de estas? Si tu materia es otra, podés crearla igual.',
          suggestions: [similar],
        },
      },
    })
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(screen.getByLabelText('Agregar materia'), { target: { value: 'Analisis Matematico 1' } })
    const addButton = await screen.findByRole('button', {
      name: 'Agregar «Analisis Matematico 1» como materia nueva',
    })
    await user.click(addButton)

    expect(
      await screen.findByText('¿Quisiste decir alguna de estas? Si tu materia es otra, podés crearla igual.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Análisis Matemático I' }))
    await waitFor(() => {
      expect(userService.enrollSubject).toHaveBeenCalledWith('sim-1')
    })
  })

  it('forces creation from the 409 SIMILAR_SUBJECTS panel with "Crear igual"', async () => {
    const similar = makeCommunitySubject({ id: 'sim-1', name: 'Análisis Matemático I' })
    vi.mocked(subjectService.createCommunity)
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: { code: 'SIMILAR_SUBJECTS', message: '¿Quisiste decir…?', suggestions: [similar] },
        },
      })
      .mockResolvedValueOnce({
        outcome: 'created',
        subject: makeCommunitySubject({ id: 'new-1', name: 'Analisis Matematico 1' }),
      })
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(screen.getByLabelText('Agregar materia'), { target: { value: 'Analisis Matematico 1' } })
    const addButton = await screen.findByRole('button', {
      name: 'Agregar «Analisis Matematico 1» como materia nueva',
    })
    await user.click(addButton)
    await screen.findByText('¿Quisiste decir…?')

    await user.click(screen.getByRole('button', { name: 'Crear igual' }))

    await waitFor(() => {
      expect(subjectService.createCommunity).toHaveBeenLastCalledWith({
        name: 'Analisis Matematico 1',
        force: true,
      })
    })
  })

  it('offers the AI spelling fix on 409 NAME_SUGGESTION without applying it automatically', async () => {
    vi.mocked(subjectService.createCommunity)
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            code: 'NAME_SUGGESTION',
            message: '¿Quisiste escribir «Análisis Matemático II»? Elegí cómo querés guardarla.',
            suggestedName: 'Análisis Matemático II',
          },
        },
      })
      .mockResolvedValueOnce({
        outcome: 'created',
        subject: makeCommunitySubject({ id: 'new-1', name: 'Análisis Matemático II' }),
      })
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(screen.getByLabelText('Agregar materia'), { target: { value: 'analisis matematico ii' } })
    const addButton = await screen.findByRole('button', {
      name: 'Agregar «analisis matematico ii» como materia nueva',
    })
    await user.click(addButton)

    expect(
      await screen.findByText('¿Quisiste escribir «Análisis Matemático II»? Elegí cómo querés guardarla.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Usar «Análisis Matemático II»' }))

    await waitFor(() => {
      expect(subjectService.createCommunity).toHaveBeenLastCalledWith({
        name: 'Análisis Matemático II',
        force: undefined,
      })
    })
  })

  it('shows the backend message on a 422 SUBJECT_NAME_REJECTED', async () => {
    vi.mocked(subjectService.createCommunity).mockRejectedValue({
      response: {
        status: 422,
        data: {
          code: 'SUBJECT_NAME_REJECTED',
          layer: 'ai',
          reason: 'not_a_subject',
          message: 'Ese nombre no parece una materia real. Escribí el nombre como figura en tu plan de estudios.',
        },
      },
    })
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(screen.getByLabelText('Agregar materia'), { target: { value: 'asdasdasd' } })
    const addButton = await screen.findByRole('button', {
      name: 'Agregar «asdasdasd» como materia nueva',
    })
    await user.click(addButton)

    expect(
      await screen.findByText('Ese nombre no parece una materia real. Escribí el nombre como figura en tu plan de estudios.'),
    ).toBeInTheDocument()
  })

  it('shows a CTA to set the university on UNIVERSITY_REQUIRED', async () => {
    vi.mocked(subjectService.suggest).mockRejectedValue({
      response: {
        status: 400,
        data: {
          code: 'UNIVERSITY_REQUIRED',
          message: 'Para buscar y crear materias primero elegí tu universidad en tu perfil.',
        },
      },
    })
    renderPage()

    fireEvent.change(screen.getByLabelText('Agregar materia'), { target: { value: 'anal' } })

    expect(await screen.findByText('Elegí tu universidad')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a mi perfil' })).toBeInTheDocument()
  })

  it('filters the catalog explorer by my university', async () => {
    renderPage()

    await waitFor(() => {
      expect(subjectService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ universityId: 'uni-1' }),
      )
    })
  })
})
