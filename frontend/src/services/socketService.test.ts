import { beforeEach, describe, expect, it, vi } from 'vitest'

const connectMock = vi.fn()
const fakeSocket = {
  connected: false,
  auth: {} as Record<string, string | null>,
  connect: connectMock,
  disconnect: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => fakeSocket),
}))

describe('socketService', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
    fakeSocket.connected = false
    fakeSocket.auth = {}
  })

  it('refreshes auth token before connecting an existing socket', async () => {
    localStorage.setItem('accessToken', 'old-token')
    const service = await import('./socketService')

    service.getSocket()

    localStorage.setItem('accessToken', 'new-token')
    service.connectSocket()

    expect(fakeSocket.auth).toEqual({ token: 'new-token' })
    expect(connectMock).toHaveBeenCalledTimes(1)
  })
})
