import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useUniversities, useUniversityCareers } from '../../hooks/useUniversities'
import { normalizeUsernameInput } from '../../utils/username'
import { OTHER_CAREER_LABEL, OTHER_CAREER_VALUE } from '../../utils/careers'
import { Button, Input, Select } from '../UI'

export function LoginForm() {
  const { login, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email, password })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h2 className="text-[22px] font-bold">Iniciar sesión</h2>
      {error && (
        <div className="px-4 py-3 rounded-[12px] text-sm bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.2)]">
          {error}
        </div>
      )}
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
  const { universities } = useUniversities()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    universityId: '',
    careerId: '',
    careerName: '',
    year: 1,
    username: '',
    displayName: '',
    avatarUrl: '',
  })
  const { groups: careerGroups } = useUniversityCareers(form.universityId || undefined)
  const [localError, setLocalError] = useState('')

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const setUniversityId = (universityId: string) =>
    setForm((prev) => ({ ...prev, universityId, careerId: '', careerName: '' }))

  const setCareerId = (careerId: string) =>
    setForm((prev) => ({
      ...prev,
      careerId,
      careerName: careerId === OTHER_CAREER_VALUE ? prev.careerName : '',
    }))

  const isOtherCareer = form.careerId === OTHER_CAREER_VALUE

  const nextStep = () => {
    if (step === 1) {
      if (!form.email || !form.password) { setLocalError('Completá todos los campos'); return }
      if (form.password.length < 8) { setLocalError('La contraseña debe tener al menos 8 caracteres'); return }
      if (form.password !== form.confirmPassword) { setLocalError('Las contraseñas no coinciden'); return }
    }
    if (step === 2) {
      if (!form.universityId) { setLocalError('Elegí tu universidad'); return }
      if (!form.careerId) { setLocalError('Elegí tu carrera'); return }
      if (isOtherCareer && form.careerName.trim().length < 3) {
        setLocalError('Escribí el nombre de tu carrera (mínimo 3 caracteres)')
        return
      }
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
      universityId: form.universityId,
      ...(isOtherCareer
        ? { careerName: form.careerName.trim() }
        : { careerId: form.careerId }),
      year: form.year,
      avatarUrl: form.avatarUrl || undefined,
    })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep() }}>
      {/* Stepper */}
      <div className="flex justify-center items-center pb-2 gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-[background,transform] duration-200 ${
              s <= step
                ? 'bg-accent scale-[1.3]'
                : 'bg-[var(--overlay-soft)]'
            }`}
          />
        ))}
      </div>
      <h2 className="text-[22px] font-bold">
        {step === 1 && 'Tu cuenta'}
        {step === 2 && 'Tu universidad'}
        {step === 3 && 'Tu perfil'}
      </h2>

      {(error || localError) && (
        <div className="px-4 py-3 rounded-[12px] text-sm bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.2)]">
          {localError || error}
        </div>
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
          <Select id="reg-uni" label="Universidad" value={form.universityId}
            onChange={(e) => setUniversityId(e.target.value)}
            options={universities.map((u) => ({ value: u.id, label: u.name }))} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary" htmlFor="reg-career">Carrera</label>
            <select
              id="reg-career"
              className="w-full min-h-11 px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none appearance-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              value={form.careerId}
              onChange={(e) => setCareerId(e.target.value)}
              disabled={!form.universityId}
              required
            >
              <option value="">Seleccionar...</option>
              {careerGroups.map((g) => (
                <optgroup key={g.faculty} label={g.faculty}>
                  {g.careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              {form.universityId && (
                <option value={OTHER_CAREER_VALUE}>{OTHER_CAREER_LABEL}</option>
              )}
            </select>
          </div>
          {isOtherCareer && (
            <Input id="reg-career-name" label="Nombre de tu carrera" value={form.careerName}
              onChange={(e) => set('careerName', e.target.value)}
              placeholder="Ej: Licenciatura en Arte Digital"
              minLength={3} maxLength={120} required />
          )}
          <Input id="reg-year" label="Año actual" type="number" value={form.year}
            onChange={(e) => set('year', parseInt(e.target.value))} min={1} max={7} required />
        </>
      )}

      {step === 3 && (
        <>
          <Input id="reg-username" label="Username" prefix="@" value={form.username}
            onChange={(e) => set('username', normalizeUsernameInput(e.target.value))}
            placeholder="tualias" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
          <Input id="reg-displayname" label="Nombre para mostrar" value={form.displayName}
            onChange={(e) => set('displayName', e.target.value)} placeholder="Tu nombre" required />
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2.5">
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
        <p className="text-[13px] text-secondary text-center">
          ¿Ya tenés cuenta?{' '}
          <button
            type="button"
            className="text-accent-light text-[length:inherit] underline"
            onClick={onSwitchToLogin}
          >
            Iniciar sesión
          </button>
        </p>
      )}
    </form>
  )
}
