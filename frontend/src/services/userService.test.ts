import { userService } from './userService'
import { api } from './api'

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('userService (leaderboard)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('getGlobalLeaderboard reads GET /users/leaderboard/global with a limit', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    await userService.getGlobalLeaderboard(20)
    expect(api.get).toHaveBeenCalledWith('/users/leaderboard/global', {
      params: { limit: 20, university: undefined },
    })
  })

  it('getGlobalLeaderboard forwards the university filter when given', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    await userService.getGlobalLeaderboard(20, 'Universidad de Buenos Aires')
    expect(api.get).toHaveBeenCalledWith('/users/leaderboard/global', {
      params: { limit: 20, university: 'Universidad de Buenos Aires' },
    })
  })

  it('getLeaderboardUniversities reads GET /users/leaderboard/universities', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: ['UBA', 'UTN'] })
    const result = await userService.getLeaderboardUniversities()
    expect(api.get).toHaveBeenCalledWith('/users/leaderboard/universities')
    expect(result).toEqual(['UBA', 'UTN'])
  })

  it('getMyLeaderboardPosition reads GET /users/leaderboard/me with no filters by default', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { rank: 5, elo: 1200, total: 40 } })
    const result = await userService.getMyLeaderboardPosition()
    expect(api.get).toHaveBeenCalledWith('/users/leaderboard/me', { params: {} })
    expect(result).toEqual({ rank: 5, elo: 1200, total: 40 })
  })

  it('getMyLeaderboardPosition forwards university and subjectId filters', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { rank: 1, elo: 1500, total: 3 } })
    await userService.getMyLeaderboardPosition({ university: 'UBA', subjectId: 'subj-1' })
    expect(api.get).toHaveBeenCalledWith('/users/leaderboard/me', {
      params: { university: 'UBA', subjectId: 'subj-1' },
    })
  })
})
