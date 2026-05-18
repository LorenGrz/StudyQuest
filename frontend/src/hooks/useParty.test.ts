import { renderHook, waitFor } from '@testing-library/react'
import { useParty } from './useParty'
import { partyService } from '../services/partyService'

const emit = vi.fn()
const on = vi.fn()
const off = vi.fn()

vi.mock('../services/partyService', () => ({
  partyService: {
    findById: vi.fn(),
    getChat: vi.fn(),
    uploadFileMessage: vi.fn(),
    uploadAudioMessage: vi.fn(),
  },
  normalizeChatMessage: vi.fn((message) => message),
}))

vi.mock('./useSocket', () => ({
  useSocket: () => ({
    socket: {
      connected: true,
      emit,
      on,
      off,
    },
  }),
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
    },
  }),
}))

describe('useParty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces a real load error instead of silently falling back to mock messages', async () => {
    vi.mocked(partyService.findById).mockRejectedValue(new Error('boom'))
    vi.mocked(partyService.getChat).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useParty('party-1'))

    await waitFor(() => {
      expect(result.current.isPartyLoading).toBe(false)
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.chatError).toMatch(/historial|chat/i)
  })
})
