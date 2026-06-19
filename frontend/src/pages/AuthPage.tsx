import { useState } from 'react'
import { AuthLayout } from '../components/Layouts'
import { LoginForm, RegisterForm } from '../components/AuthForms'

const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <AuthLayout>
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
