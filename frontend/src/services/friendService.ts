import { api } from './api'
import type { User } from './userService'

export interface FriendRequest {
  id: string
  requesterId: string
  requesteeId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  respondedAt: string | null
  requester?: User
  requestee?: User
}

export const friendService = {
  async getFriends(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/me/friends')
    return data
  },

  async getFriendRequests(): Promise<FriendRequest[]> {
    const { data } = await api.get<FriendRequest[]>('/users/me/friends/requests')
    return data
  },

  async getOutgoingFriendRequests(): Promise<FriendRequest[]> {
    const { data } = await api.get<FriendRequest[]>('/users/me/friends/requests/outgoing')
    return data
  },

  async sendFriendRequest(username: string): Promise<FriendRequest> {
    const { data } = await api.post<FriendRequest>(`/users/me/friends/request/${username}`)
    return data
  },

  async acceptFriendRequest(requestId: string): Promise<FriendRequest> {
    const { data } = await api.patch<FriendRequest>(`/users/me/friends/requests/${requestId}/accept`)
    return data
  },

  async rejectFriendRequest(requestId: string): Promise<FriendRequest> {
    const { data } = await api.patch<FriendRequest>(`/users/me/friends/requests/${requestId}/reject`)
    return data
  },

  async removeFriend(friendId: string): Promise<void> {
    await api.delete(`/users/me/friends/${friendId}`)
  },
}
