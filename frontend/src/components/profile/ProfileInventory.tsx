import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Spinner, Button, Modal } from '../../components/UI'
import { resolveMediaUrl } from '../../components/AvatarWithBorder'
import type { UserInventory } from '../../services/userService'

interface ProfileInventoryProps {
  user: any
  inventory: UserInventory
  loading: boolean
  error: string | null
  isUpdatingCosmetics: boolean
  equipTitle: (titleCode: string | null) => Promise<void>
  equipBorder: (borderCode: string | null) => Promise<void>
}

export function ProfileInventory(props: ProfileInventoryProps) {
  const { user, inventory, loading, error } = props
  const [open, setOpen] = useState(false)

  const count = (inventory.titles?.length ?? 0) + (inventory.borders?.length ?? 0)
  const activeTitle = inventory.titles?.find(
    (t) => t.code === user.activeCosmetics?.titleCode,
  )

  return (
    <section>
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-base font-bold text-secondary uppercase tracking-[1px]">
          Inventario
        </h3>
        {!loading && !error && (
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Personalizar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[80px]">
          <Spinner size="sm" />
        </div>
      ) : error ? (
        <div className="bg-surface border border-[var(--overlay-border)] rounded-lg p-4">
          <p className="text-sm font-semibold text-primary">{error}</p>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 bg-surface border border-[var(--overlay-border)] rounded-lg p-4 text-left transition-colors hover:bg-elevated"
        >
          <span className="text-sm text-secondary">
            {activeTitle ? (
              <>
                Título:{' '}
                <span className="font-semibold text-primary">
                  {activeTitle.text}
                </span>
              </>
            ) : (
              'Sin título equipado'
            )}
          </span>
          <span className="ml-auto text-sm font-bold text-primary shrink-0">
            {count} {count === 1 ? 'ítem' : 'ítems'}
          </span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <Modal title="Inventario" size="lg" onClose={() => setOpen(false)}>
            <InventoryPicker {...props} />
          </Modal>
        )}
      </AnimatePresence>
    </section>
  )
}

function InventoryPicker({
  user,
  inventory,
  isUpdatingCosmetics,
  equipTitle,
  equipBorder,
}: ProfileInventoryProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-medium text-secondary mb-2">Títulos</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
          <button
            className="inline-flex items-center justify-center border text-sm font-semibold text-primary cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => equipTitle(null)}
            disabled={isUpdatingCosmetics}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              borderColor: user.activeCosmetics?.titleCode
                ? 'var(--border)'
                : 'var(--accent)',
              background: user.activeCosmetics?.titleCode
                ? 'var(--bg-surface)'
                : 'rgba(99, 102, 241, 0.1)',
              minHeight: '44px',
            }}
          >
            Sin título
          </button>
          {inventory.titles.map((title) => (
            <button
              key={title.code}
              className="inline-flex items-center justify-center border text-sm font-semibold text-primary cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => equipTitle(title.code)}
              disabled={isUpdatingCosmetics}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                borderColor:
                  user.activeCosmetics?.titleCode === title.code
                    ? 'var(--accent)'
                    : 'var(--border)',
                background:
                  user.activeCosmetics?.titleCode === title.code
                    ? 'rgba(99, 102, 241, 0.1)'
                    : 'var(--bg-surface)',
                minHeight: '44px',
              }}
            >
              {title.text}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-6">
        <p className="text-[13px] font-medium text-secondary mb-2">Bordes</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4 mt-3">
          <div
            className={`flex flex-col items-center gap-2 px-2 py-3 border-2 border-[var(--overlay-border)] rounded-lg bg-transparent cursor-pointer transition-all duration-200 hover:border-accent hover:bg-[var(--overlay-subtle)] ${!user.activeCosmetics?.borderCode ? 'border-accent bg-[rgba(99,102,241,0.1)] shadow-[0_0_16px_rgba(99,102,241,0.2)]' : ''}`}
            onClick={() => equipBorder(null)}
            style={{ opacity: isUpdatingCosmetics ? 0.5 : 1 }}
          >
            <div className="w-11 h-11 rounded-full bg-transparent relative flex items-center justify-center">
              <span style={{ fontSize: '14px', fontWeight: 800 }}>
                {user.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-medium text-secondary text-center">
              Sin borde
            </span>
          </div>
          {inventory.borders?.map((border) => (
            <div
              key={border.code}
              className={`flex flex-col items-center gap-2 px-2 py-3 border-2 border-[var(--overlay-border)] rounded-lg bg-transparent cursor-pointer transition-all duration-200 hover:border-accent hover:bg-[var(--overlay-subtle)] ${user.activeCosmetics?.borderCode === border.code ? 'border-accent bg-[rgba(99,102,241,0.1)] shadow-[0_0_16px_rgba(99,102,241,0.2)]' : ''}`}
              onClick={() => equipBorder(border.code)}
              style={{ opacity: isUpdatingCosmetics ? 0.5 : 1 }}
            >
              <div className="w-11 h-11 rounded-full bg-transparent relative flex items-center justify-center">
                <span style={{ fontSize: '14px', fontWeight: 800 }}>
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
                <img
                  src={resolveMediaUrl(border.imageUrl) || ''}
                  alt=""
                  className="absolute w-16 h-16 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
              <span className="text-xs font-medium text-secondary text-center">
                {border.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
