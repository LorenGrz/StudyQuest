import { api } from './api'
import type { Subject } from './userService'

export interface SubjectQuery {
  search?: string
  career?: string
  university?: string
  semester?: number
}

export const subjectService = {
  async findAll(query: SubjectQuery = {}): Promise<Subject[]> {
    const { data } = await api.get<any>('/subjects', { params: query })
    return data.items || data
  },

  async findById(id: string): Promise<Subject> {
    const { data } = await api.get<Subject>(`/subjects/${id}`)
    return data
  },

  async getUniversities(search?: string): Promise<string[]> {
    const { data } = await api.get<string[]>('/subjects/universities', {
      params: search ? { search } : {},
    })
    return data
  },

  async getCareers(university: string): Promise<string[]> {
    const { data } = await api.get<string[]>('/subjects/careers', {
      params: { university },
    })
    return data
  },
}
