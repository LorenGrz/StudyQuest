import { act, renderHook, waitFor } from '@testing-library/react'
import { useMatch } from './useMatch'
import { partyService } from '../services/partyService'

vi.mock('../services/partyService', () => ({
  partyService: {
    discover: vi.fn(),
    join: vi.fn(),
  },
}))

const partyA = {
  id: 'party-a',
  subjectId: 'subject-a',
  subject: { id: 'subject-a', name: 'Bases de Datos', code: 'BD' },
  members: [],
  maxMembers: 4,
  status: 'forming',
  quests: [],
  isPrivate: false,
  createdAt: '',
  updatedAt: '',
} as any

const partyB = {
  ...partyA,
  id: 'party-b',
  subject: { id: 'subject-b', name: 'Algoritmos y Estructuras de Datos', code: 'AED' },
} as any

describe('useMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads discoverable parties over REST and exposes the top card', async () => {
    vi.mocked(partyService.discover).mockResolvedValue([partyA, partyB])

    const { result } = renderHook(() => useMatch())

    await act(async () => {
      await result.current.load()
    })

    expect(partyService.discover).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('ready')
    expect(result.current.parties).toHaveLength(2)
    expect(result.current.top).toEqual(partyB)
  })

  it('discards only the local top card without calling the backend', async () => {
    vi.mocked(partyService.discover).mockResolvedValue([partyA, partyB])

    const { result } = renderHook(() => useMatch())

    await act(async () => {
      await result.current.load()
    })

    act(() => {
      result.current.discard('party-b')
    })

    expect(partyService.join).not.toHaveBeenCalled()
    expect(result.current.top).toEqual(partyA)
    expect(result.current.status).toBe('ready')
  })

  it('joins a party over REST and removes it from the deck', async () => {
    vi.mocked(partyService.discover).mockResolvedValue([partyA, partyB])
    vi.mocked(partyService.join).mockResolvedValue({ ...partyB, status: 'active' })

    const { result } = renderHook(() => useMatch())

    await act(async () => {
      await result.current.load()
    })

    let joined: any
    await act(async () => {
      joined = await result.current.join('party-b')
    })

    await waitFor(() => {
      expect(partyService.join).toHaveBeenCalledWith('party-b')
      expect(joined.id).toBe('party-b')
      expect(result.current.top).toEqual(partyA)
    })
  })

  it('moves to empty when there are no discoverable parties', async () => {
    vi.mocked(partyService.discover).mockResolvedValue([])

    const { result } = renderHook(() => useMatch())

    await act(async () => {
      await result.current.load()
    })

    expect(result.current.status).toBe('empty')
    expect(result.current.top).toBeNull()
  })

  it('exposes an error state when discovery fails', async () => {
    vi.mocked(partyService.discover).mockRejectedValue({
      response: { data: { message: 'No se pudieron cargar las parties' } },
    })

    const { result } = renderHook(() => useMatch())

    await act(async () => {
      await result.current.load()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('No se pudieron cargar las parties')
  })
})
