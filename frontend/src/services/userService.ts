import { api } from './api'

export interface UserStats {
  xp: number
  level: number
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

export const userService = {
  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/users/me')
    return data
  },

  async updateMe(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await api.patch<User>('/users/me', payload)
    return data
  },

  async enrollSubject(subjectId: string): Promise<void> {
    await api.post('/users/me/subjects', { subjectId })
  },

  async unenrollSubject(subjectId: string): Promise<void> {
    await api.delete(`/users/me/subjects/${subjectId}`)
  },
}
