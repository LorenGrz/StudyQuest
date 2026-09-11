import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BillingPage from './BillingPage'
import { billingService } from '../services/billingService'

vi.mock('../services/billingService', () => ({
  billingService: {
    getState: vi.fn(),
    getPlans: vi.fn(),
    redeem: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const freeState = {
  plan: 'free',
  effectivePlan: 'free',
  planExpiresAt: null,
  planSource: null,
  limits: {
    questsPerDay: 20,
    maxUploadMb: 10,
    maxInstructionsChars: 500,
    aiModelTier: 'lite',
    partySizeMax: 6,
    studyBotEnabled: false,
  },
  usage: { questsToday: 4, questsPerDay: 20 },
}

const plans = [
  { id: 'free', name: 'Free', blurb: 'gratis', perks: ['20 quests/día'], limits: freeState.limits },
  { id: 'pro', name: 'Pro', blurb: 'más', perks: ['100 quests/día'], limits: freeState.limits },
]

const renderPage = () =>
  render(
    <MemoryRouter>
      <BillingPage />
    </MemoryRouter>,
  )

describe('BillingPage', () => {
  beforeEach(() => {
    vi.mocked(billingService.getState).mockResolvedValue(freeState as never)
    vi.mocked(billingService.getPlans).mockResolvedValue(plans as never)
  })

  it('shows the current plan and daily usage', async () => {
    renderPage()
    expect(await screen.findByText('4 / 20')).toBeInTheDocument()
    // "Free" appears as the badge and as the plan-card title.
    expect(screen.getAllByText('Free').length).toBeGreaterThanOrEqual(1)
  })

  it('redeems a code and reflects the upgraded plan', async () => {
    vi.mocked(billingService.redeem).mockResolvedValue({
      ...freeState,
      plan: 'pro',
      effectivePlan: 'pro',
      planSource: 'promo',
      planExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
      usage: { questsToday: 4, questsPerDay: 100 },
    } as never)

    renderPage()
    await screen.findByText('4 / 20')

    fireEvent.change(screen.getByLabelText(/código promocional/i), {
      target: { value: 'studyquest-pro-30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /canjear/i }))

    await waitFor(() => {
      expect(billingService.redeem).toHaveBeenCalledWith('STUDYQUEST-PRO-30')
    })
    // Usage bar now reflects the Pro daily cap.
    expect(await screen.findByText('4 / 100')).toBeInTheDocument()
  })

  it('surfaces a load error with a retry', async () => {
    vi.mocked(billingService.getState).mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(/no se pudo cargar tu plan/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })
})
