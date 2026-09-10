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
})
