import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../../components/UI'
import { useCareers } from '../../hooks/useUniversities'
import { userService } from '../../services/userService'

interface EditProfileModalProps {
  user: any
  onClose: () => void
  onUpdate: (user: any) => void
}

export function EditProfileModal({ user, onClose, onUpdate }: EditProfileModalProps) {
  const { careers } = useCareers()
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    university: user.university,
    career: user.career,
    year: user.year,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const updatedUser = await userService.updateMe({
        ...formData,
        year: Number(formData.year),
      })
      onUpdate(updatedUser)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al actualizar perfil")
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
            <label className="text-[13px] font-medium text-secondary">Universidad</label>
            <input
              className="w-full px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)] min-h-[44px]"
              value={formData.university}
              onChange={(e) =>
                setFormData({ ...formData, university: e.target.value })
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary">Carrera</label>
            <select
              className="w-full px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)] min-h-[44px]"
              value={formData.career}
              onChange={(e) =>
                setFormData({ ...formData, career: e.target.value })
              }
              required
            >
              <option value="">Seleccionar...</option>
              {careers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-secondary">Año actual</label>
            <input
              type="number"
              className="w-full px-3.5 py-3 bg-panel border border-[var(--overlay-border)] rounded-lg text-primary text-[15px] transition-[border-color,box-shadow] duration-200 outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.3)] min-h-[44px]"
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: e.target.value })
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
