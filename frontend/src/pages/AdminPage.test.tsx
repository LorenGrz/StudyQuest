import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminPage from './AdminPage'
import { adminService } from '../services/adminService'

// AdminPage renders inside AppShell, which mounts the study-bot widget —
// stub its plan check so this test doesn't fire a real network request.
vi.mock('../services/billingService', () => ({
  billingService: { getState: vi.fn().mockResolvedValue({ limits: { studyBotEnabled: false } }) },
}))

vi.mock('../services/adminService', () => ({
  adminService: {
    getCareerRequests: vi.fn(),
    approveCareerRequest: vi.fn(),
    rejectCareerRequest: vi.fn(),
    getCommunitySubjects: vi.fn(),
    publishSubject: vi.fn(),
    hideSubject: vi.fn(),
    unhideSubject: vi.fn(),
    renameSubject: vi.fn(),
    mergeSubjects: vi.fn(),
  },
}))

// The career request approve form loads the university's careers; not under
// test here.
vi.mock('../hooks/useUniversities', () => ({
  useUniversityCareers: () => ({ careers: [], isLoading: false }),
}))

const pendingRequest = {
  id: 'req-1',
  name: 'Licenciatura en Arte Digital',
  status: 'pending' as const,
  universityId: 'uni-1',
  universityName: 'Universidad de Buenos Aires',
  userId: 'u1',
  username: 'anadev',
  displayName: 'Ana Dev',
  careerId: null,
  adminNote: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  resolvedAt: null,
}

const subjectA = {
  id: 'subj-a',
  name: 'Taller de Tesis',
  nameNormalized: 'taller de tesis',
  universityId: 'uni-1',
  universityName: 'Universidad de Buenos Aires',
  careerId: null,
  source: 'community' as const,
  visibility: 'private' as const,
  status: 'active' as const,
  enrolledCount: 3,
  createdBy: 'u1',
  createdByUsername: 'anadev',
  createdAt: '2026-09-25T00:00:00.000Z',
  reportCount: 0,
  reportReasons: [],
}

const subjectB = {
  ...subjectA,
  id: 'subj-b',
  name: 'Taller de Tesis (copia)',
  createdByUsername: 'otheruser',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.mocked(adminService.getCareerRequests).mockResolvedValue([pendingRequest])
    vi.mocked(adminService.getCommunitySubjects).mockResolvedValue([subjectA, subjectB])
    vi.mocked(adminService.approveCareerRequest).mockResolvedValue({ approvedRequests: 1 })
    vi.mocked(adminService.rejectCareerRequest).mockResolvedValue({
      ...pendingRequest,
      status: 'rejected',
    })
    vi.mocked(adminService.mergeSubjects).mockResolvedValue({ enrolledCount: 3 })
  })

  afterEach(() => vi.clearAllMocks())

  it('shows the career-requests tab by default', async () => {
    renderPage()
    expect(await screen.findByText('Licenciatura en Arte Digital')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pedidos de carrera' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('approves a career request', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprobación' }))

    await waitFor(() =>
      expect(adminService.approveCareerRequest).toHaveBeenCalledWith(
        'req-1',
        expect.objectContaining({ name: 'Licenciatura en Arte Digital' }),
      ),
    )
  })

  it('rejects a career request', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, rechazar' }))

    await waitFor(() =>
      expect(adminService.rejectCareerRequest).toHaveBeenCalledWith('req-1', undefined),
    )
  })

  it('switches to the community-subjects tab and lists subjects', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Materias de la comunidad' }))
    expect(await screen.findByText('Taller de Tesis')).toBeInTheDocument()
  })

  it('merges a subject into another', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Materias de la comunidad' }))
    await screen.findByText('Taller de Tesis')

    const [mergeButtonA] = screen.getAllByRole('button', { name: 'Fusionar con…' })
    fireEvent.click(mergeButtonA)
    fireEvent.change(screen.getByLabelText('Fusionar esta materia con…'), {
      target: { value: 'subj-b' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar fusión' }))

    await waitFor(() =>
      expect(adminService.mergeSubjects).toHaveBeenCalledWith('subj-a', 'subj-b'),
    )
  })
})
