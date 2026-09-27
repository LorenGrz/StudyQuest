import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import BillingPage from './BillingPage'
import { billingService } from '../services/billingService'

vi.mock('../services/billingService', () => ({
  billingService: {
    getState: vi.fn(),
    getPlans: vi.fn(),
    redeem: vi.fn(),
    getQuote: vi.fn(),
    createCheckout: vi.fn(),
    getPayment: vi.fn(),
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

const quote = { available: true, usd: 5, amountArs: 6200, fxRate: 1234.5, days: 30 }
const PAY_ID = '11111111-2222-4333-8444-555555555555'

function LocationProbe() {
  const loc = useLocation()
  return <span data-testid="search">{loc.search}</span>
}

const renderPage = (url = '/plan') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <BillingPage />
      <LocationProbe />
    </MemoryRouter>,
  )

describe('BillingPage', () => {
  beforeEach(() => {
    vi.mocked(billingService.getState).mockResolvedValue(freeState as never)
    vi.mocked(billingService.getPlans).mockResolvedValue(plans as never)
    vi.mocked(billingService.getQuote).mockResolvedValue(quote as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
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

  describe('Mercado Pago', () => {
    it('shows the pay button with the ARS price', async () => {
      renderPage()
      expect(
        await screen.findByRole('button', {
          name: /pagar con mercado pago · \$6\.200 ARS \(USD 5\)/i,
        }),
      ).toBeInTheDocument()
      expect(screen.getByText(/pagando con mercado pago/i)).toBeInTheDocument()
    })

    it('offers to extend when the user is already Pro', async () => {
      vi.mocked(billingService.getState).mockResolvedValue({
        ...freeState,
        plan: 'pro',
        effectivePlan: 'pro',
        planSource: 'mercadopago',
        planExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
      } as never)
      renderPage()
      expect(
        await screen.findByRole('button', { name: /extender 30 días · \$6\.200 ARS/i }),
      ).toBeInTheDocument()
      expect(screen.getByText(/mercado pago · vence el/i)).toBeInTheDocument()
    })

    it('hides the pay button when payments are unavailable', async () => {
      vi.mocked(billingService.getQuote).mockResolvedValue({ available: false } as never)
      renderPage()
      await screen.findByText('4 / 20')
      expect(screen.queryByRole('button', { name: /mercado pago/i })).not.toBeInTheDocument()
      expect(screen.getByText('Pro se activa con un código promocional.')).toBeInTheDocument()
    })

    it('creates a checkout and redirects to Mercado Pago', async () => {
      const assign = vi.fn()
      vi.stubGlobal('location', { ...window.location, assign })
      const initPoint = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=p1'
      vi.mocked(billingService.createCheckout).mockResolvedValue({
        paymentId: PAY_ID,
        initPoint,
        amountArs: 6200,
        fxRate: 1234.5,
        usd: 5,
      })

      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: /pagar con mercado pago/i }))

      await waitFor(() => expect(assign).toHaveBeenCalledWith(initPoint))
      expect(billingService.createCheckout).toHaveBeenCalledTimes(1)
      vi.unstubAllGlobals()
    })

    it.each([
      'https://evil.example.com/mercadopago.com',
      'https://evil.mercadopago.com.ar/checkout',
      'https://mercadopago.com.ar.evil.com/checkout',
      'https://www.mercadopago.com/checkout',
      'http://www.mercadopago.com.ar/checkout',
    ])('refuses to redirect to %s', async (initPoint) => {
      const assign = vi.fn()
      vi.stubGlobal('location', { ...window.location, assign })
      vi.mocked(billingService.createCheckout).mockResolvedValue({
        paymentId: PAY_ID,
        initPoint,
        amountArs: 6200,
        fxRate: 1234.5,
        usd: 5,
      })

      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: /pagar con mercado pago/i }))

      await waitFor(() => expect(toast.error).toHaveBeenCalled())
      expect(assign).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('on ?pago=ok polls the payment every 3s until it is applied', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.mocked(billingService.getPayment)
        .mockResolvedValueOnce({ id: PAY_ID, status: 'pending', amountArs: 6200, appliedAt: null, needsSupport: false })
        .mockResolvedValueOnce({ id: PAY_ID, status: 'pending', amountArs: 6200, appliedAt: null, needsSupport: false })
        .mockResolvedValue({
          id: PAY_ID,
          status: 'approved',
          amountArs: 6200,
          appliedAt: new Date().toISOString(),
          needsSupport: false,
        })

      renderPage(
        `/plan?pago=ok&external_reference=${PAY_ID}&payment_id=123456&collection_status=approved`,
      )
      expect(await screen.findByText(/confirmando tu pago/i)).toBeInTheDocument()
      // MP's payment_id is forwarded as a hint (the backend verifies it).
      expect(billingService.getPayment).toHaveBeenCalledWith(PAY_ID, '123456')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      expect(billingService.getPayment).toHaveBeenCalledTimes(2)
      expect(toast.success).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('¡Pago acreditado! Ya tenés Pro.', {
          id: 'mp-return',
        }),
      )
      // Query params cleared, polling stopped.
      await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''))
      const calls = vi.mocked(billingService.getPayment).mock.calls.length
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000)
      })
      expect(billingService.getPayment).toHaveBeenCalledTimes(calls)
    })

    it('shows the "acreditando" message after 60s without confirmation', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.mocked(billingService.getPayment).mockResolvedValue({
        id: PAY_ID,
        status: 'pending',
        amountArs: 6200,
        appliedAt: null,
        needsSupport: false,
      })

      renderPage(`/plan?pago=pendiente&external_reference=${PAY_ID}`)
      expect(await screen.findByText(/quedó pendiente/i)).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000)
      })
      expect(
        await screen.findByText('Tu pago se está acreditando, puede tardar unos minutos.'),
      ).toBeInTheDocument()
      // 1 immediate check + 20 more (every 3s for 60s), then it stops.
      expect(billingService.getPayment).toHaveBeenCalledTimes(21)
    })

    const proState = (expires: string) =>
      ({ ...freeState, plan: 'pro', effectivePlan: 'pro', planExpiresAt: expires }) as never

    it('without a payment id, succeeds only when the plan changes while polling', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      // getState has several callers (page load, study-bot widget, polling):
      // drive it by "has the payment landed yet" rather than by call order.
      let paid = false
      vi.mocked(billingService.getState).mockImplementation(async () =>
        paid ? proState('2026-12-01T00:00:00.000Z') : (freeState as never),
      )
      renderPage('/plan?pago=ok')
      await screen.findByText(/confirmando tu pago/i)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(toast.success).not.toHaveBeenCalled()
      paid = true

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      await waitFor(() => expect(toast.success).toHaveBeenCalled())
      expect(billingService.getPayment).not.toHaveBeenCalled()
    })

    it('without a payment id, being Pro already is not reported as a new payment', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.mocked(billingService.getState).mockResolvedValue(proState('2026-12-01T00:00:00.000Z'))
      renderPage('/plan?pago=ok')
      await screen.findByText(/confirmando tu pago/i)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000)
      })
      expect(
        await screen.findByText('Tu pago se está acreditando, puede tardar unos minutos.'),
      ).toBeInTheDocument()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('stops polling and shows support when the payment needs review', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.mocked(billingService.getPayment).mockResolvedValue({
        id: PAY_ID,
        status: 'approved',
        amountArs: 6200,
        appliedAt: null,
        needsSupport: true,
      })
      renderPage(`/plan?pago=ok&external_reference=${PAY_ID}`)

      expect(await screen.findByText(/revisión manual/i)).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(PAY_ID)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000)
      })
      expect(billingService.getPayment).toHaveBeenCalledTimes(1)
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('hides the pay button for a permanent (no expiry) Pro', async () => {
      vi.mocked(billingService.getState).mockResolvedValue({
        ...freeState,
        plan: 'pro',
        effectivePlan: 'pro',
        planSource: 'admin',
        planExpiresAt: null,
      } as never)
      renderPage()
      await screen.findByText('4 / 20')
      expect(screen.queryByRole('button', { name: /mercado pago|extender/i })).not.toBeInTheDocument()
    })

    it('on ?pago=error shows an error toast and clears the params', async () => {
      renderPage('/plan?pago=error')
      await waitFor(() => expect(toast.error).toHaveBeenCalled())
      await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''))
      expect(billingService.getPayment).not.toHaveBeenCalled()
    })
  })
})
