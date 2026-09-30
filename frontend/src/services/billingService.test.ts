import { billingService } from './billingService'
import { api } from './api'

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

describe('billingService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
  })

  it('getState reads GET /billing/me', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { plan: 'free' } })
    const s = await billingService.getState()
    expect(api.get).toHaveBeenCalledWith('/billing/me')
    expect(s).toEqual({ plan: 'free' })
  })

  it('getPlans reads GET /billing/plans', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 'free' }, { id: 'pro' }] })
    const p = await billingService.getPlans()
    expect(api.get).toHaveBeenCalledWith('/billing/plans')
    expect(p).toHaveLength(2)
  })

  it('redeem posts the code to /billing/redeem', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { plan: 'pro' } })
    await billingService.redeem('STUDYQUEST-PRO-30')
    expect(api.post).toHaveBeenCalledWith('/billing/redeem', {
      code: 'STUDYQUEST-PRO-30',
    })
  })

  it('getQuote reads GET /payments/quote', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { available: false } })
    await expect(billingService.getQuote()).resolves.toEqual({ available: false })
    expect(api.get).toHaveBeenCalledWith('/payments/quote')
  })

  it('createCheckout posts to /payments/checkout', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { initPoint: 'https://x' } })
    await billingService.createCheckout()
    expect(api.post).toHaveBeenCalledWith('/payments/checkout')
  })

  it('getPayment reads GET /payments/:id (encoded)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'a/b' } })
    await billingService.getPayment('a/b')
    expect(api.get).toHaveBeenCalledWith('/payments/a%2Fb', undefined)
  })

  it('getPayment forwards the MP payment_id as a hint', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'p1' } })
    await billingService.getPayment('p1', '123456')
    expect(api.get).toHaveBeenCalledWith('/payments/p1', { params: { hint: '123456' } })
  })
})
