import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button, Input } from './UI'

export function LoginForm() {
  const { login, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email, password })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="auth-form-title">Iniciar sesión</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <Input
        id="login-email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
        autoComplete="email"
      />
      <Input
        id="login-password"
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />
      <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
        Entrar
      </Button>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading, error } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    career: '',
    semester: 1,
    username: '',
    displayName: '',
    avatarUrl: '',
  })
  const [localError, setLocalError] = useState('')

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const nextStep = () => {
    if (step === 1) {
      if (!form.email || !form.password) { setLocalError('Completá todos los campos'); return }
      if (form.password.length < 8) { setLocalError('La contraseña debe tener al menos 8 caracteres'); return }
      if (form.password !== form.confirmPassword) { setLocalError('Las contraseñas no coinciden'); return }
    }
    if (step === 2) {
      if (!form.university || !form.career) { setLocalError('Completá universidad y carrera'); return }
    }
    setLocalError('')
    setStep((s) => s + 1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.displayName) { setLocalError('Completá username y nombre'); return }
    register({
      email: form.email,
      password: form.password,
      username: form.username,
      displayName: form.displayName,
      university: form.university,
      career: form.career,
      semester: form.semester,
      avatarUrl: form.avatarUrl || undefined,
    })
  }

  return (
    <form className="auth-form" onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep() }}>
      <div className="auth-stepper">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`step-dot ${s <= step ? 'step-dot-active' : ''}`} />
        ))}
      </div>
      <h2 className="auth-form-title">
        {step === 1 && 'Tu cuenta'}
        {step === 2 && 'Tu universidad'}
        {step === 3 && 'Tu perfil'}
      </h2>

      {(error || localError) && (
        <div className="alert alert-danger">{localError || error}</div>
      )}

      {step === 1 && (
        <>
          <Input id="reg-email" label="Email" type="email" value={form.email}
            onChange={(e) => set('email', e.target.value)} placeholder="tu@email.com" required />
          <Input id="reg-password" label="Contraseña" type="password" value={form.password}
            onChange={(e) => set('password', e.target.value)} placeholder="Mínimo 8 caracteres" required />
          <Input id="reg-confirm" label="Confirmar contraseña" type="password" value={form.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)} placeholder="Repetí tu contraseña" required />
        </>
      )}

      {step === 2 && (
        <>
          <Input id="reg-uni" label="Universidad" value={form.university}
            onChange={(e) => set('university', e.target.value)} placeholder="UBA, UTN, UNC..." required />
          <Input id="reg-career" label="Carrera" value={form.career}
            onChange={(e) => set('career', e.target.value)} placeholder="Ingeniería, Sistemas..." required />
          <Input id="reg-semester" label="Semestre / Año" type="number" value={form.semester}
            onChange={(e) => set('semester', parseInt(e.target.value))} min={1} max={12} required />
        </>
      )}

      {step === 3 && (
        <>
          <Input id="reg-username" label="Username" value={form.username}
            onChange={(e) => set('username', e.target.value)} placeholder="@tualias" required />
          <Input id="reg-displayname" label="Nombre para mostrar" value={form.displayName}
            onChange={(e) => set('displayName', e.target.value)} placeholder="Tu nombre" required />
        </>
      )}

      <div className="auth-form-actions">
        {step > 1 && (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
            ← Volver
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} size="lg" className="flex-1">
          {step < 3 ? 'Siguiente →' : 'Crear cuenta'}
        </Button>
      </div>

      {step === 1 && (
        <p className="auth-switch">
          ¿Ya tenés cuenta?{' '}
          <button type="button" className="link-btn" onClick={onSwitchToLogin}>
            Iniciar sesión
          </button>
        </p>
      )}
    </form>
  )
}
