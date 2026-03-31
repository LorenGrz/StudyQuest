import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, type RegisterPayload, type LoginPayload } from '../services/authService'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setTokens, setUser, logout: storeLogout, accessToken, refreshToken } = useAuthStore()
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
      setError(err?.response?.data?.message ?? 'Error al iniciar sesión')
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
      setError(err?.response?.data?.message ?? 'Error al registrarse')
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
