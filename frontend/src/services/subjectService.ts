import { api } from './api'
import type { Subject } from './userService'

export interface SubjectQuery {
  search?: string
  career?: string
  university?: string
  universityId?: string
  year?: number
}

// ─── Community subjects (R2) ───────────────────────────────────────────────

export type CommunitySubjectSource = 'official' | 'community' | 'legacy'
export type CommunitySubjectVisibility = 'private' | 'university'
export type CommunitySubjectStatus = 'active' | 'hidden' | 'merged'

/** GET /subjects/suggest item and POST /subjects/community result. */
export interface CommunitySubject {
  id: string
  name: string
  code: string | null
  /** null for community subjects (no plan year). */
  year: number | null
  universityId: string | null
  careerId: string | null
  /** Badge: official → "Oficial". */
  source: CommunitySubjectSource
  /** Badge: private → "Privada". */
  visibility: CommunitySubjectVisibility
  status: CommunitySubjectStatus
  enrolledCount: number
  enrolled: boolean
  createdByMe: boolean
}

export type CreateCommunitySubjectOutcome =
  | 'created'
  | 'revived'
  | 'enrolled_existing'
  | 'already_enrolled'

export interface CreateCommunitySubjectResult {
  outcome: CreateCommunitySubjectOutcome
  subject: CommunitySubject
}

export interface CreateCommunitySubjectInput {
  name: string
  careerId?: string
  /** Resend after "¿Quisiste decir…?" to create anyway. */
  force?: boolean
}

export type SubjectReportReason = 'offensive' | 'not_a_subject' | 'duplicate' | 'other'

export interface ReportSubjectInput {
  reason?: SubjectReportReason
  details?: string
}

export interface ReportSubjectResult {
  reported: true
  alreadyReported: boolean
  hidden: boolean
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

  /** Autocomplete in my university: official + public + my private ones. */
  async suggest(q: string, limit = 10): Promise<CommunitySubject[]> {
    const { data } = await api.get<CommunitySubject[]>('/subjects/suggest', {
      params: { q, limit },
    })
    return data
  },

  /** Create (or reuse) a community subject and enroll me. */
  async createCommunity(
    input: CreateCommunitySubjectInput,
  ): Promise<CreateCommunitySubjectResult> {
    const { data } = await api.post<CreateCommunitySubjectResult>('/subjects/community', input)
    return data
  },

  async reportSubject(
    subjectId: string,
    input: ReportSubjectInput = {},
  ): Promise<ReportSubjectResult> {
    const { data } = await api.post<ReportSubjectResult>(`/subjects/${subjectId}/report`, input)
    return data
  },
}
