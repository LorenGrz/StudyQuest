import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const connectSocket = vi.fn(() => ({ connected: false }))
const getSocket = vi.fn(() => ({ connected: false }))

vi.mock('../services/socketService', () => ({
  connectSocket,
  getSocket,
}))

const useAuthStore = vi.fn()

vi.mock('../store/authStore', () => ({
  useAuthStore: () => useAuthStore(),
}))

describe('useSocket', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('does not connect during render when the user is not authenticated', async () => {
    useAuthStore.mockReturnValue({ isAuthenticated: false })
    const { useSocket } = await import('./useSocket')

    renderHook(() => useSocket())

    expect(connectSocket).not.toHaveBeenCalled()
    expect(getSocket).toHaveBeenCalledTimes(1)
  })
})
