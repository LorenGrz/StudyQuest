import { api } from './api'

export interface UserStats {
  xp: number
  level: number
  elo: number
  quizzesPlayed: number
  quizzesWon: number
  currentStreak: number
  longestStreak: number
  lastPlayedAt: string | null
}

export interface AvailabilitySlot {
  day: number
  hour: number
}

export interface Subject {
  id: string
  name: string
  code: string
  career: string
  university: string
  semester: number
  description?: string
}

export interface DashboardStudyPoint {
  day: string
  minutes: number
  totalTimeMs: number
}

export interface DashboardSubjectPerformance {
  subjectId: string
  subjectName: string
  accuracy: number
  totalQuestions: number
  correctAnswers: number
  totalStudyMinutes: number
  quizzesPlayed: number
}

export interface DashboardStats {
  totalStudyMinutes: number
  weeklyStudy: DashboardStudyPoint[]
  subjectPerformance: DashboardSubjectPerformance[]
}

export interface ActiveCosmetics {
  titleCode: string | null
  titleText: string | null
}

export interface InventoryTitleItem {
  code: string
  name: string
  text: string
  unlockedAt: string
}

export interface UserInventory {
  titles: InventoryTitleItem[]
}

export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  university: string
  career: string
  semester: number
  enrolledSubjects: Subject[]
  availability: AvailabilitySlot[]
  stats: UserStats
  activeCosmetics?: ActiveCosmetics
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateProfilePayload {
  displayName?: string
  avatarUrl?: string
  university?: string
  career?: string
  semester?: number
  availability?: AvailabilitySlot[]
}

export interface SetActiveCosmeticsPayload {
  titleCode?: string | null
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  elo: number
}

export const userService = {
  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/users/me')
    return data
  },

  async updateMe(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await api.patch<User>('/users/me', payload)
    return data
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/users/me/stats')
    return data
  },

  async getInventory(): Promise<UserInventory> {
    const { data } = await api.get<UserInventory>('/users/me/inventory')
    return data
  },

  async setActiveCosmetics(payload: SetActiveCosmeticsPayload): Promise<User> {
    const { data } = await api.patch<User>('/users/me/cosmetics', payload)
    return data
  },

  async enrollSubject(subjectId: string): Promise<void> {
    await api.post('/users/me/subjects', { subjectId })
  },

  async unenrollSubject(subjectId: string): Promise<void> {
    await api.delete(`/users/me/subjects/${subjectId}`)
  },

  async getLeaderboard(subjectId: string, limit = 20): Promise<LeaderboardEntry[]> {
    const { data } = await api.get<LeaderboardEntry[]>(
      `/users/leaderboard/${subjectId}?limit=${limit}`,
    )
    return data
  },
}

