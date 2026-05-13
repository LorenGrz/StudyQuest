import { api } from './api'

export interface SkillNode {
  id: string
  subjectId: string
  topic: string
  name: string
  description: string | null
  iconKey: string
  xpThreshold: number
  prerequisiteIds: string[]
  col: number
  row: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  topicXp: number
  unlocked: boolean
  progressPercent: number
  prerequisitesMet: boolean
}

export const skillTreeService = {
  async getTree(subjectId: string): Promise<SkillNode[]> {
    const { data } = await api.get<SkillNode[]>(`/subjects/${subjectId}/skill-tree`)
    return data
  },
}
