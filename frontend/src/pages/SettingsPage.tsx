import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { MobileLayout } from '../components/Layouts'
import { Button, Badge, Input } from '../components/UI'
import { AvatarWithBorder } from '../components/AvatarWithBorder'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../hooks/useTheme'
import { userService } from '../services/userService'

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'apariencia', label: 'Apariencia' },
  { id: 'notificaciones', label: 'Notificaciones' },
] as const

type TabId = (typeof TABS)[number]['id']

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('perfil')

  return (
    <MobileLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex flex-col flex-1"
      >
        <h1 className="text-xl font-bold text-primary mt-4 mb-3">Configuración</h1>

      {/*
        Single tab list — rendered once.
        Mobile: horizontal scrollable row (flex-row gap-2 overflow-x-auto)
        Desktop (md+): vertical rail beside the content panel (via parent flex-row)
      */}
      <div className="flex flex-col gap-4 mt-2">
        {/* Tab rail — horizontal on mobile, vertical on desktop */}
        <div
          role="tablist"
          className="flex flex-row gap-2 overflow-x-auto pb-2 scrollbar-none"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors min-h-[44px] md:rounded-lg md:text-left md:whitespace-normal md:w-full ${
                activeTab === tab.id
                  ? 'bg-accent text-primary font-semibold'
                  : 'bg-surface text-muted md:bg-transparent md:hover:bg-elevated md:hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content panel — sizes to its content (no forced full-height stretch) */}
        <div className="bg-surface rounded-2xl p-4 mt-2 border border-edge md:rounded-xl md:p-6 md:mt-0 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'perfil' && <ProfileTab />}
              {activeTab === 'seguridad' && <SecurityTab />}
              {activeTab === 'apariencia' && <AppearanceTab />}
              {activeTab === 'notificaciones' && <NotificationsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      </motion.div>
    </MobileLayout>
  )
}

// ─── Perfil ──────────────────────────────────────────────────────────────────

function ProfileTab() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    userService.getMe().then((me) => {
      setUser(me)
      setUsername(me.username)
      setBio(me.bio ?? '')
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  if (!user) return null

  const onPickFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('La imagen no puede superar los 2MB')
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return
    try {
      setIsUploading(true)
      const updated = await userService.uploadAvatar(avatarFile)
      setUser(updated)
      setAvatarFile(null)
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
      toast.success('Foto de perfil actualizada')
    } catch {
      toast.error('No se pudo subir la imagen')
    } finally {
      setIsUploading(false)
    }
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const updated = await userService.updateMe({
        username: username.trim(),
        bio: bio.trim(),
      })
      setUser(updated)
      toast.success('Perfil actualizado')
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Ese nombre de usuario ya está en uso')
      } else {
        toast.error('No se pudo actualizar el perfil')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {avatarPreview ? (
          <img
            src={avatarPreview}
            alt="Vista previa del avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-accent"
          />
        ) : (
          <AvatarWithBorder
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            borderImageUrl={user.activeCosmetics?.borderImageUrl}
            size="lg"
          />
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Elegir foto
          </Button>
          {avatarFile && (
            <Button type="button" size="sm" isLoading={isUploading} onClick={uploadAvatar}>
              Guardar foto
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={saveProfile} className="flex flex-col gap-4">
        <Input
          id="settings-username"
          label="Nombre de usuario"
          value={username}
          maxLength={30}
          minLength={3}
          required
          onChange={(e) => setUsername(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="settings-bio" className="text-sm text-muted">
            Bio
          </label>
          <textarea
            id="settings-bio"
            value={bio}
            maxLength={500}
            rows={4}
            placeholder="Contanos algo sobre vos..."
            onChange={(e) => setBio(e.target.value)}
            className="bg-input text-primary rounded-xl p-3 text-sm border border-edge focus:border-accent outline-none resize-none min-h-[44px]"
          />
          <span className="text-xs text-muted self-end">{bio.length}/500</span>
        </div>
        <Button type="submit" isLoading={isSaving}>
          Guardar cambios
        </Button>
      </form>
    </div>
  )
}

// ─── Seguridad ───────────────────────────────────────────────────────────────

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const tooShort = newPassword.length > 0 && newPassword.length < 8
  const sameAsCurrent = newPassword.length > 0 && newPassword === currentPassword
  const canSubmit =
    currentPassword.length >= 8 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !sameAsCurrent

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    try {
      setIsSaving(true)
      await userService.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Contraseña actualizada. Se cerraron las demás sesiones.')
    } catch (err: any) {
      if (err?.response?.status === 401) {
        toast.error('La contraseña actual es incorrecta')
      } else {
        toast.error('No se pudo cambiar la contraseña')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        id="current-password"
        type="password"
        label="Contraseña actual"
        value={currentPassword}
        autoComplete="current-password"
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <Input
        id="new-password"
        type="password"
        label="Nueva contraseña"
        value={newPassword}
        autoComplete="new-password"
        error={
          tooShort
            ? 'Debe tener al menos 8 caracteres'
            : sameAsCurrent
              ? 'Debe ser distinta a la actual'
              : undefined
        }
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input
        id="confirm-password"
        type="password"
        label="Confirmar nueva contraseña"
        value={confirmPassword}
        autoComplete="new-password"
        error={mismatch ? 'Las contraseñas no coinciden' : undefined}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button type="submit" disabled={!canSubmit} isLoading={isSaving}>
        Cambiar contraseña
      </Button>
    </form>
  )
}

// ─── Apariencia ──────────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex items-center justify-between p-4 bg-elevated rounded-xl border border-edge">
      <div className="flex flex-col">
        <span className="text-primary font-medium">
          {isDark ? 'Tema oscuro' : 'Tema claro'}
        </span>
        <span className="text-xs text-muted">
          Tu preferencia se guarda en este dispositivo
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Cambiar tema"
        onClick={toggle}
        className={`relative w-12 h-7 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center ${
          isDark ? 'bg-accent' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all flex items-center justify-center text-[10px] ${
            isDark ? 'left-6' : 'left-1'
          }`}
        >
          {isDark ? '🌙' : '☀️'}
        </span>
      </button>
    </div>
  )
}

// ─── Notificaciones (placeholder) ────────────────────────────────────────────

function NotificationsTab() {
  const rows = ['Recordatorios de estudio', 'Invitaciones a party', 'Resultados de torneos']

  return (
    <div className="flex flex-col gap-3">
      {rows.map((label) => (
        <div
          key={label}
          className="flex items-center justify-between p-4 bg-elevated rounded-xl border border-edge opacity-60"
        >
          <span className="text-primary text-sm">{label}</span>
          <div className="w-12 h-7 rounded-full bg-muted/40" aria-hidden />
        </div>
      ))}
      <div className="self-center mt-1">
        <Badge variant="primary">Próximamente</Badge>
      </div>
    </div>
  )
}
