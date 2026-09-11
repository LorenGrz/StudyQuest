import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { StudyBotWidget } from './StudyBotWidget'
import { billingService } from '../../services/billingService'
import { studyBotService } from '../../services/studyBotService'

vi.mock('../../services/billingService', () => ({
  billingService: { getState: vi.fn() },
}))

vi.mock('../../services/studyBotService', () => ({
  studyBotService: { ask: vi.fn() },
}))

const proState = { limits: { studyBotEnabled: true } }
const freeState = { limits: { studyBotEnabled: false } }

describe('StudyBotWidget', () => {
  it('renders nothing for a free user', async () => {
    vi.mocked(billingService.getState).mockResolvedValue(freeState as never)

    const { container } = render(<StudyBotWidget />)

    await waitFor(() => expect(billingService.getState).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the floating button for a pro user and opens the chat', async () => {
    vi.mocked(billingService.getState).mockResolvedValue(proState as never)

    render(<StudyBotWidget />)

    const toggle = await screen.findByRole('button', { name: /abrir bot de estudio/i })
    fireEvent.click(toggle)

    expect(screen.getByRole('dialog', { name: /bot de estudio/i })).toBeInTheDocument()
  })

  it('sends a question and renders the answer', async () => {
    vi.mocked(billingService.getState).mockResolvedValue(proState as never)
    vi.mocked(studyBotService.ask).mockResolvedValue('Vas bien en Física.')

    render(<StudyBotWidget />)

    fireEvent.click(await screen.findByRole('button', { name: /abrir bot de estudio/i }))
    fireEvent.change(screen.getByLabelText(/mensaje para el bot de estudio/i), {
      target: { value: '¿Cómo voy?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^enviar$/i }))

    expect(await screen.findByText('¿Cómo voy?')).toBeInTheDocument()
    expect(await screen.findByText('Vas bien en Física.')).toBeInTheDocument()
    expect(studyBotService.ask).toHaveBeenCalledWith('¿Cómo voy?')
  })
})
