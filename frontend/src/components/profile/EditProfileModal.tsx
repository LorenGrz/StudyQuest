import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { motion } from 'framer-motion'
import { Button } from '../../components/UI'
import { useUniversities, useUniversityCareers } from '../../hooks/useUniversities'
import { userService, type User } from '../../services/userService'
import { universityService } from '../../services/universityService'
import { OTHER_CAREER_VALUE } from '../../utils/careers'
import { CareerCombobox } from '../CareerCombobox'

interface EditProfileModalProps {
  user: User
  onClose: () => void
  onUpdate: (user: User) => void
}

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const m: unknown = err.response?.data?.message
    if (typeof m === 'string' && m.trim()) return m
    if (err.message) return err.message
  }
  return fallback
}

export function EditProfileModal({ user, onClose, onUpdate }: EditProfileModalProps) {
  const { universities } = useUniversities()
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    universityId: user.universityId ?? '',
    careerId: user.careerId ?? '',
    careerName: '',
    year: user.year,
  })
  const { careers } = useUniversityCareers(formData.universityId || undefined)
  const [pendingCareerName, setPendingCareerName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isOtherCareer = formData.careerId === OTHER_CAREER_VALUE

  // The pending request only carries an id on the user; its name lives on
  // GET /career-requests/mine.
  useEffect(() => {
    let cancelled = false
    if (!user.pendingCareerRequestId) {
      setPendingCareerName(null)
      return
    }
    universityService.getMyCareerRequests().then((requests) => {
      if (cancelled) return
      const match = requests.find((r) => r.id === user.pendingCareerRequestId)
      setPendingCareerName(match?.name ?? null)
    })
    return () => { cancelled = true }
  }, [user.pendingCareerRequestId])

  const setUniversityId = (universityId: string) =>
    setFormData((prev) => ({ ...prev, universityId, careerId: '', careerName: '' }))

  const setCareerId = (careerId: string) =>
    setFormData((prev) => ({
      ...prev,
      careerId,
      careerName: careerId === OTHER_CAREER_VALUE ? prev.careerName : '',
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const updatedUser = await userService.updateMe({
        displayName: formData.displayName,
        universityId: formData.universityId,
        ...(isOtherCareer
          ? { careerName: formData.careerName.trim() }
          : formData.careerId
            ? { careerId: formData.careerId }
            : {}),
        year: Number(formData.year),
      })
      onUpdate(updatedUser)
      onClose()
    } catch (err) {
      setError(messageFromError(err, 'Error al actualizar perfil'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-[300] flex items-end backdrop-blur-[4px]"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="w-full max-w-[480px] mx-auto bg-elevated border-t border-[var(--overlay-border)] rounded-t-[24px] pt-6 px-5 pb-9 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="w-9 h-1 rounded-sm bg-[var(--overlay-border)] mx-auto -mb-2" />
        <h2 className="text-lg font-extrabold">Editar Perfil</h2>

        {error && <div className="px-4 py-3 rounded-lg text-sm bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.2)]">{error}</div>}

        {pendingCareerName && (
          <div className="px-4 py-3 rounded-lg text-sm bg-[rgba(245,158,11,0.1)] text-warning border border-[rgba(245,158,11,0.2)]">
            Carrera pendiente de aprobación: «{pendingCareerName}»
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 mt-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary">Nombre Completo</label>
            <input
              className="w-full px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)] min-h-[44px]"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary" htmlFor="profile-university">Universidad</label>
            <select
              id="profile-university"
              className="w-full px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)] min-h-[44px]"
              value={formData.universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <CareerCombobox
            id="profile-career"
            label="Carrera"
            careers={careers}
            value={formData.careerId}
            onChange={setCareerId}
            disabled={!formData.universityId}
          />
          {isOtherCareer && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-secondary" htmlFor="profile-career-name">Nombre de tu carrera</label>
              <input
                id="profile-career-name"
                className="w-full px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)] min-h-[44px]"
                value={formData.careerName}
                onChange={(e) => setFormData({ ...formData, careerName: e.target.value })}
                minLength={3}
                maxLength={120}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary">Año actual</label>
            <input
              type="number"
              className="w-full px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)] min-h-[44px]"
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: Number(e.target.value) })
              }
              min="1"
              max="7"
              required
            />
          </div>

          <div className="flex gap-2.5 mt-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isLoading}
            >
              Guardar
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
