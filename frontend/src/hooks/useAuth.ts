import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, type RegisterPayload, type LoginPayload } from '../services/authService'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setTokens, setUser, logout: storeLogout, refreshToken } = useAuthStore()
  const navigate = useNavigate()

  const login = async (payload: LoginPayload) => {
    setIsLoading(true)
    setError(null)
    try {
      const tokens = await authService.login(payload)
      setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await userService.getMe()
      setUser(user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'No se pudo conectar con el servidor. Si es la primera carga del día, el servidor tarda ~1 minuto en despertar. Intentá de nuevo.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true)
    setError(null)
    try {
      const tokens = await authService.register(payload)
      setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await userService.getMe()
      setUser(user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'No se pudo conectar con el servidor. Si es la primera carga del día, el servidor tarda ~1 minuto en despertar. Intentá de nuevo.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (refreshToken) await authService.logout(refreshToken)
    } catch { /* ignore */ }
    storeLogout()
    navigate('/auth')
  }

  return { login, register, logout, isLoading, error, clearError: () => setError(null) }
}
