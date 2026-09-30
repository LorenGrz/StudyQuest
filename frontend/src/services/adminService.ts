import { api } from './api'
import type { CareerLevel } from './universityService'

export type CareerRequestStatus = 'pending' | 'approved' | 'rejected'

export interface AdminCareerRequest {
  id: string
  name: string
  status: CareerRequestStatus
  universityId: string
  universityName: string | null
  userId: string
  username: string | null
  displayName: string | null
  careerId: string | null
  adminNote: string | null
  createdAt: string
  resolvedAt: string | null
}

/** `{ careerId }` links an existing career; `{ name, faculty?, level? }` creates one. */
export interface ApproveCareerRequestPayload {
  careerId?: string
  name?: string
  faculty?: string
  level?: CareerLevel
}

export type AdminSubjectSource = 'official' | 'community' | 'legacy'
export type AdminSubjectVisibility = 'private' | 'university'
export type AdminSubjectStatus = 'active' | 'hidden' | 'merged'
export type AdminCommunitySubjectTab = 'new' | 'reported' | 'private'

export interface AdminCommunitySubject {
  id: string
  name: string
  nameNormalized: string
  universityId: string | null
  universityName: string | null
  careerId: string | null
  source: AdminSubjectSource
  visibility: AdminSubjectVisibility
  status: AdminSubjectStatus
  enrolledCount: number
  createdBy: string | null
  createdByUsername: string | null
  createdAt: string
  reportCount: number
  reportReasons: string[]
}

export const adminService = {
  async getCareerRequests(status?: CareerRequestStatus): Promise<AdminCareerRequest[]> {
    const { data } = await api.get<AdminCareerRequest[]>('/admin/career-requests', {
      params: status ? { status } : {},
    })
    return data
  },

  async approveCareerRequest(
    id: string,
    payload: ApproveCareerRequestPayload,
  ): Promise<{ approvedRequests: number }> {
    const { data } = await api.post<{ approvedRequests: number }>(
      `/admin/career-requests/${id}/approve`,
      payload,
    )
    return data
  },

  async rejectCareerRequest(id: string, adminNote?: string): Promise<AdminCareerRequest> {
    const { data } = await api.post<AdminCareerRequest>(`/admin/career-requests/${id}/reject`, {
      adminNote,
    })
    return data
  },

  async getCommunitySubjects(tab: AdminCommunitySubjectTab): Promise<AdminCommunitySubject[]> {
    const { data } = await api.get<AdminCommunitySubject[]>('/admin/community-subjects', {
      params: { tab },
    })
    return data
  },

  async publishSubject(id: string): Promise<{ published: true }> {
    const { data } = await api.post<{ published: true }>(`/admin/community-subjects/${id}/publish`)
    return data
  },

  async hideSubject(id: string): Promise<{ hidden: true }> {
    const { data } = await api.post<{ hidden: true }>(`/admin/community-subjects/${id}/hide`)
    return data
  },

  async unhideSubject(id: string): Promise<{ hidden: false }> {
    const { data } = await api.post<{ hidden: false }>(`/admin/community-subjects/${id}/unhide`)
    return data
  },

  async renameSubject(id: string, name: string): Promise<{ id: string; name: string }> {
    const { data } = await api.post<{ id: string; name: string }>(
      `/admin/community-subjects/${id}/rename`,
      { name },
    )
    return data
  },

  async mergeSubjects(fromId: string, toId: string): Promise<{ enrolledCount: number }> {
    const { data } = await api.post<{ enrolledCount: number }>('/admin/community-subjects/merge', {
      fromId,
      toId,
    })
    return data
  },
}
