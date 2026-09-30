import { api } from './api'
import type { Subject } from './userService'

export interface SubjectQuery {
  search?: string
  career?: string
  university?: string
  year?: number
}

export const subjectService = {
  async findAll(query: SubjectQuery = {}): Promise<Subject[]> {
    const { data } = await api.get<{ items?: Subject[] } | Subject[]>('/subjects', { params: query })
    return Array.isArray(data) ? data : (data.items ?? [])
  },

  async findById(id: string): Promise<Subject> {
    const { data } = await api.get<Subject>(`/subjects/${id}`)
    return data
  },

  // Deprecated: register/profile now use universityService (GET /universities).
  async getCareers(): Promise<string[]> {
    const { data } = await api.get<string[]>('/subjects/careers')
    return data
  },
}
