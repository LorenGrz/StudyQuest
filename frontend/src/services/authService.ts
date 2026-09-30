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
  universityId: string
  /** A career from the catalog (GET /universities/:id/careers). */
  careerId?: string
  /** "Otra (no está en la lista)": creates a pending career request. */
  careerName?: string
  year: number
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
