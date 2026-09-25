import { api } from './api'

export interface SearchResultUserDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  university: string
  career: string
}

export interface SearchResultSubjectDto {
  id: string
  name: string
  code: string
  university: string
  career: string
  year: number
  enrolledCount: number
}

export interface SearchResultQuestDto {
  id: string
  title: string
  subjectId: string
  subjectName: string
  status: string
  createdAt: string
}

export interface GlobalSearchResponseDto {
  users: SearchResultUserDto[]
  subjects: SearchResultSubjectDto[]
  quests: SearchResultQuestDto[]
  totalResults: number
}

export const searchService = {
  async searchGlobal(q: string, limit = 10): Promise<GlobalSearchResponseDto> {
    const { data } = await api.get<GlobalSearchResponseDto>('/search/global', {
      params: { q, limit },
    })
    return data
  },
}
