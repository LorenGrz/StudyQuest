import { useState, useEffect } from 'react'
import { AuthLayout } from '../components/Layouts'
import { LoginForm, RegisterForm } from '../components/auth/AuthForms'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [apiReady, setApiReady] = useState(true)

  useEffect(() => {
    let mounted = true
    let timer: ReturnType<typeof setTimeout>

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) })
        if (mounted) setApiReady(res.ok)
      } catch {
        if (mounted) {
          setApiReady(false)
          timer = setTimeout(check, 4000)
        }
      }
    }

    check()
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  return (
    <AuthLayout>
      {!apiReady && (
        <div className="mb-4 px-4 py-3 rounded-[12px] text-sm bg-[rgba(234,179,8,0.1)] text-yellow-400 border border-[rgba(234,179,8,0.2)]">
          El servidor está iniciando (plan gratuito). Puede tardar hasta 1 minuto en la primera carga del día.
        </div>
      )}
      {mode === 'login' ? (
        <>
          <LoginForm />
          <p className="mt-4 text-center text-[13px] text-secondary">
            ¿No tenés cuenta?{' '}
            <button
              type="button"
              className="text-accent-light text-[length:inherit] underline hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              onClick={() => setMode('register')}
            >
              Registrarse
            </button>
          </p>
        </>
      ) : (
        <RegisterForm onSwitchToLogin={() => setMode('login')} />
      )}
    </AuthLayout>
  )
}

export default AuthPage
