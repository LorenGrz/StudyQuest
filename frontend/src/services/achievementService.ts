import { api } from './api'

export interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: string
  points: number
}

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  unlockedAt: string
  achievement: Achievement
}

export const achievementService = {
  async getAll(): Promise<Achievement[]> {
    const { data } = await api.get<Achievement[]>('/achievements')
    return data
  },

  async getMyAchievements(): Promise<UserAchievement[]> {
    const { data } = await api.get<UserAchievement[]>('/users/me/achievements')
    return data
  },
}
