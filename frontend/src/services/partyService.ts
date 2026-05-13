import { api } from './api'
import type { User } from './userService'

export interface ChatMessage {
  id: string
  text: string
  userId: string
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  createdAt: string
}

export interface Activity {
  id: string
  type: string
  description: string
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  createdAt: string
  metadata?: any
}

export interface PartyMember {
  id: string
  userId: string
  partyXp: number
  isOnline: boolean
  joinedAt: string
  role: 'leader' | 'member'
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'stats'>
}

export interface PartySubject {
  id: string
  name: string
  code: string
}

export interface PartyQuest {
  id: string
  title: string
  status: string
}

export interface Party {
  id: string
  name?: string
  subjectId: string
  subject: PartySubject
  members: PartyMember[]
  maxMembers: number
  status: 'forming' | 'active' | 'closed' | 'waiting'
  quests: PartyQuest[]
  isPrivate: boolean
  createdAt: string
  updatedAt: string
}

export const partyService = {
  async getMine(): Promise<Party[]> {
    const { data } = await api.get<Party[]>('/parties/mine')
    return data
  },

  async discover(): Promise<Party[]> {
    const { data } = await api.get<Party[]>('/parties/discover')
    return data
  },

  async join(partyId: string): Promise<Party> {
    const { data } = await api.post<Party>(`/parties/${partyId}/join`)
    return data
  },

  async findById(id: string): Promise<Party> {
    const { data } = await api.get<Party>(`/parties/${id}`)
    return data
  },

  async getChat(partyId: string, limit = 100): Promise<ChatMessage[]> {
    const { data } = await api.get<ChatMessage[]>(`/parties/${partyId}/chat`, {
      params: { limit },
    })
    return data
  },

  async create(subjectId?: string, maxMembers = 4, isPrivate = false): Promise<Party> {
    const { data } = await api.post<Party>('/parties', { subjectId, maxMembers, isPrivate })
    return data
  },

  async updateVisibility(partyId: string, isPrivate: boolean): Promise<void> {
    await api.patch(`/parties/${partyId}/visibility`, { isPrivate })
  },

  async generateInvite(partyId: string): Promise<{ token: string; expiresInHours: number }> {
    const { data } = await api.post<{ token: string; expiresInHours: number }>(`/parties/${partyId}/invite`)
    return data
  },

  async joinByInvite(token: string): Promise<Party> {
    const { data } = await api.post<Party>(`/parties/join-invite/${token}`)
    return data
  },

  async leaveParty(partyId: string): Promise<void> {
    await api.post(`/parties/${partyId}/leave`)
  },

  async removeMember(partyId: string, targetUserId: string): Promise<void> {
    await api.delete(`/parties/${partyId}/members/${targetUserId}`)
  },

  async closeParty(partyId: string): Promise<void> {
    await api.delete(`/parties/${partyId}`)
  },

  async sendMessage(partyId: string, text: string): Promise<ChatMessage> {
    const { data } = await api.post<ChatMessage>(`/parties/${partyId}/chat`, {
      text,
    })
    return data
  },

  async getActivity(partyId: string, limit = 50): Promise<Activity[]> {
    const { data } = await api.get<Activity[]>(`/parties/${partyId}/activity`, {
      params: { limit },
    })
    return data
  },
}
