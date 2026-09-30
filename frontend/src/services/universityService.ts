import { api } from './api'

export interface University {
  id: string
  name: string
  shortName: string | null
  website: string | null
}

export type CareerLevel = 'grado' | 'pregrado'

export interface Career {
  id: string
  universityId: string
  name: string
  faculty: string | null
  level: CareerLevel
}

export type CareerRequestStatus = 'pending' | 'approved' | 'rejected'

export interface CareerRequest {
  id: string
  name: string
  status: CareerRequestStatus
  universityId: string
  careerId: string | null
  adminNote: string | null
  createdAt: string
  resolvedAt: string | null
}

export const universityService = {
  async getUniversities(search?: string): Promise<University[]> {
    const { data } = await api.get<University[]>('/universities', {
      params: search ? { search } : {},
    })
    return data
  },

  async getCareers(universityId: string): Promise<Career[]> {
    const { data } = await api.get<Career[]>(`/universities/${universityId}/careers`)
    return data
  },

  /** The signed-in user's "Otra" career requests, newest first. */
  async getMyCareerRequests(): Promise<CareerRequest[]> {
    const { data } = await api.get<CareerRequest[]>('/career-requests/mine')
    return data
  },
}
