import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()
const get = vi.fn()
const requestUse = vi.fn()
const responseUse = vi.fn()

// axios.create() → the `api` instance (callable, like a real axios instance);
// bare axios.post → the /auth/refresh call.
vi.mock('axios', () => {
  const instance: any = vi.fn((cfg: any) => get(cfg))
  instance.get = get
  instance.post = post
  instance.interceptors = {
    request: { use: requestUse },
    response: { use: responseUse },
  }
  const axios = { create: vi.fn(() => instance), post }
  return { default: axios }
})

describe('api 401 interceptor', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('refreshToken', 'r1')
  })

  it('refreshes once for concurrent 401s (single-flight)', async () => {
    await import('./api')
    const onRejected = responseUse.mock.calls[0][1] as (e: any) => Promise<any>

    let resolveRefresh: (v: any) => void = () => {}
    post.mockImplementation(
      () => new Promise((res) => (resolveRefresh = res)),
    )
    get.mockResolvedValue({ data: 'ok' })

    const err = () => ({
      response: { status: 401 },
      config: { headers: {}, method: 'get', url: '/x' },
    })

    const p1 = onRejected(err())
    const p2 = onRejected(err())

    resolveRefresh({ data: { accessToken: 'a2', refreshToken: 'r2' } })
    await Promise.all([p1, p2])

    expect(post).toHaveBeenCalledTimes(1)
    expect(String(post.mock.calls[0][0])).toContain('/auth/refresh')
    expect(localStorage.getItem('accessToken')).toBe('a2')
    expect(localStorage.getItem('refreshToken')).toBe('r2')
  })
})
