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
          <p className="auth-switch" style={{ marginTop: '1rem', textAlign: 'center' }}>
            ¿No tenés cuenta?{' '}
            <button
              type="button"
              className="link-btn"
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
