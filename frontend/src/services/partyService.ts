import { api } from './api'
import type { User } from './userService'

const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type ChatMessageType = 'text' | 'file' | 'audio'

export interface ChatAttachment {
  url: string
  name: string
  mimeType: string
  sizeBytes: number
  durationMs?: number | null
}

export interface ChatMessage {
  id: string
  type: ChatMessageType
  text: string | null
  userId: string
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  attachment: ChatAttachment | null
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

export interface PartyInvitation {
  id: string
  partyId: string
  inviterId: string
  inviteeId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  respondedAt: string | null
  inviter?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  party?: Party
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

function resolveAttachmentUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`
  return `${API_ORIGIN}/${url}`
}

export function normalizeChatMessage(message: ChatMessage): ChatMessage {
  if (!message.attachment) return message

  return {
    ...message,
    attachment: {
      ...message.attachment,
      url: resolveAttachmentUrl(message.attachment.url),
    },
  }
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
    return data.map(normalizeChatMessage)
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

  async inviteFriend(partyId: string, inviteeId: string): Promise<void> {
    await api.post(`/parties/${partyId}/invite-friend`, { inviteeId })
  },

  async getInvitations(): Promise<PartyInvitation[]> {
    const { data } = await api.get<PartyInvitation[]>('/parties/invitations')
    return data
  },

  async acceptInvitation(invitationId: string): Promise<Party> {
    const { data } = await api.post<Party>(`/parties/invitations/${invitationId}/accept`)
    return data
  },

  async rejectInvitation(invitationId: string): Promise<void> {
    await api.post(`/parties/invitations/${invitationId}/reject`)
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
    return normalizeChatMessage(data)
  },

  async uploadFileMessage(partyId: string, file: File): Promise<ChatMessage> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<ChatMessage>(`/parties/${partyId}/chat/file`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return normalizeChatMessage(data)
  },

  async uploadAudioMessage(partyId: string, file: File, durationMs: number): Promise<ChatMessage> {
    const form = new FormData()
    form.append('file', file)
    form.append('durationMs', String(durationMs))
    const { data } = await api.post<ChatMessage>(`/parties/${partyId}/chat/audio`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return normalizeChatMessage(data)
  },

  async getActivity(partyId: string, limit = 50): Promise<Activity[]> {
    const { data } = await api.get<Activity[]>(`/parties/${partyId}/activity`, {
      params: { limit },
    })
    return data
  },
}
