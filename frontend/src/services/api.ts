import axios from 'axios'

const BASE_URL =
  (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Adjunta el access token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Single-flight refresh: concurrent 401s share one /auth/refresh call so a
// rotating backend doesn't invalidate the refresh token mid-burst.
let refreshPromise: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) throw new Error('No refresh token')
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken,
      })
      localStorage.setItem('accessToken', data.accessToken)
      // The backend rotates refresh tokens — persist the new one.
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }
      return data.accessToken as string
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// Si el token expiró (401), refresca (una sola vez) y reintenta
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      try {
        const accessToken = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = `${import.meta.env.BASE_URL}auth`
      }
    }
    return Promise.reject(error)
  },
)
