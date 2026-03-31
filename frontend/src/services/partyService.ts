import { api } from './api'
import type { User } from './userService'

export interface ChatMessage {
  id: string
  text: string
  userId: string
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  createdAt: string
}

export interface PartyMember {
  id: string
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'stats'>
  role: 'leader' | 'member'
  joinedAt: string
}

export interface Party {
  id: string
  name: string
  subjectIds: string[]
  members: PartyMember[]
  status: 'waiting' | 'active' | 'finished'
  createdAt: string
}

export const partyService = {
  async getMine(): Promise<Party[]> {
    const { data } = await api.get<Party[]>('/parties/mine')
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

  async sendMessage(partyId: string, text: string): Promise<ChatMessage> {
    const { data } = await api.post<ChatMessage>(`/parties/${partyId}/chat`, {
      text,
    })
    return data
  },
}
