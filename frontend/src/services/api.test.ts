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
  const axios = {
    create: vi.fn(() => instance),
    post,
    isAxiosError: (e: any) => Boolean(e?.isAxiosError),
  }
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

describe('api friendly error messages', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const axiosError = (status: number | undefined, message: string) => ({
    isAxiosError: true,
    message: 'Request failed',
    config: { headers: {}, _retry: true },
    response: status === undefined ? undefined : { status, data: { message, statusCode: status } },
  })

  async function reject(error: unknown) {
    await import('./api')
    const onRejected = responseUse.mock.calls[0][1] as (e: unknown) => Promise<unknown>
    return onRejected(error).catch((e: unknown) => e)
  }

  it('should replace the throttler exception text when the status is 429', async () => {
    const result: any = await reject(axiosError(429, 'ThrottlerException: Too Many Requests'))

    expect(result.response.data.message).toMatch(/Demasiadas solicitudes/)
    expect(result.response.data.statusCode).toBe(429)
    expect(result.message).toMatch(/Demasiadas solicitudes/)
  })

  it('should explain a connection problem when there is no response', async () => {
    const result: any = await reject(axiosError(undefined, ''))

    expect(result.message).toMatch(/conexión/)
  })

  it('should keep the backend message for validation errors', async () => {
    const result: any = await reject(axiosError(400, 'username must be longer than or equal to 3 characters'))

    expect(result.response.data.message).toBe('username must be longer than or equal to 3 characters')
  })
})
