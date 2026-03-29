import { api } from './api'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface RegisterPayload {
  email: string
  password: string
  username: string
  displayName: string
  university: string
  career: string
  semester: number
  avatarUrl?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/register', payload)
    return data
  },

  async login(payload: LoginPayload): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/login', payload)
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken })
  },
}
