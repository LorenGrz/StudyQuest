import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from './AuthForms'
import { OTHER_CAREER_VALUE } from '../../utils/careers'

const registerMock = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    register: registerMock,
    isLoading: false,
    error: null,
  }),
}))

const universities = [
  { id: 'uni-uba', name: 'Universidad de Buenos Aires', shortName: 'UBA', website: null },
  { id: 'uni-utn', name: 'Universidad Tecnológica Nacional', shortName: 'UTN', website: null },
]

const careersByUniversity: Record<string, Array<{ id: string; universityId: string; name: string; faculty: string | null; level: 'grado' }>> = {
  'uni-uba': [
    { id: 'car-uba-1', universityId: 'uni-uba', name: 'Ingeniería en Informática', faculty: 'Ingeniería', level: 'grado' },
  ],
  'uni-utn': [
    { id: 'car-utn-1', universityId: 'uni-utn', name: 'Ingeniería en Sistemas de Información', faculty: 'Ingeniería', level: 'grado' },
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

async function fillStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'ana@uba.ar')
  await user.type(screen.getByLabelText('Contraseña'), 'password123')
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Siguiente →' }))
}

async function fillStep3(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Username'), 'anadev')
  await user.type(screen.getByLabelText('Nombre para mostrar'), 'Ana Dev')
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
}

describe('RegisterForm', () => {
  beforeEach(() => {
    registerMock.mockClear()
  })

  it('sends careerId when the student picks a career from the catalog', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSwitchToLogin={() => {}} />)

    await fillStep1(user)
    await user.selectOptions(screen.getByLabelText('Universidad'), 'uni-uba')
    await user.selectOptions(screen.getByLabelText('Carrera'), 'car-uba-1')
    await user.click(screen.getByRole('button', { name: 'Siguiente →' }))
    await fillStep3(user)

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        universityId: 'uni-uba',
        careerId: 'car-uba-1',
      }),
    )
    expect(registerMock.mock.calls[0][0]).not.toHaveProperty('careerName')
  })

  it('sends careerName when the student picks "Otra"', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSwitchToLogin={() => {}} />)

    await fillStep1(user)
    await user.selectOptions(screen.getByLabelText('Universidad'), 'uni-uba')
    await user.selectOptions(screen.getByLabelText('Carrera'), OTHER_CAREER_VALUE)
    await user.type(screen.getByLabelText('Nombre de tu carrera'), 'Licenciatura en Arte Digital')
    await user.click(screen.getByRole('button', { name: 'Siguiente →' }))
    await fillStep3(user)

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        universityId: 'uni-uba',
        careerName: 'Licenciatura en Arte Digital',
      }),
    )
    expect(registerMock.mock.calls[0][0]).not.toHaveProperty('careerId')
  })

  it('resets the chosen career when the university changes', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSwitchToLogin={() => {}} />)

    await fillStep1(user)
    await user.selectOptions(screen.getByLabelText('Universidad'), 'uni-uba')
    await user.selectOptions(screen.getByLabelText('Carrera'), 'car-uba-1')
    expect(screen.getByLabelText('Carrera')).toHaveValue('car-uba-1')

    await user.selectOptions(screen.getByLabelText('Universidad'), 'uni-utn')
    expect(screen.getByLabelText('Carrera')).toHaveValue('')
    expect(screen.queryByText('Ingeniería en Informática')).not.toBeInTheDocument()
    expect(screen.getByText('Ingeniería en Sistemas de Información')).toBeInTheDocument()
  })
})
