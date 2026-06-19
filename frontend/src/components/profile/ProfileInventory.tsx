import { Spinner } from '../../components/UI'
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

export function ProfileInventory({
  user,
  inventory,
  loading,
  error,
  isUpdatingCosmetics,
  equipTitle,
  equipBorder,
}: ProfileInventoryProps) {
  return (
    <section>
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pb-2">Inventario</h3>
      {loading ? (
        <div className="flex justify-center items-center min-h-[120px]">
          <Spinner size="sm" />
        </div>
      ) : error ? (
        <div className="text-center py-8 px-5">
          <p className="text-sm font-semibold text-primary">{error}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-medium text-secondary mb-2">Títulos</p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => equipTitle(null)}
                disabled={isUpdatingCosmetics}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  borderColor: user.activeCosmetics?.titleCode ? 'var(--border)' : 'var(--accent)',
                  background: user.activeCosmetics?.titleCode ? 'var(--bg-surface)' : 'rgba(99, 102, 241, 0.1)',
                  minHeight: '44px',
                }}
              >
                Sin título
              </button>
              {inventory.titles.map((title) => (
                <button
                  key={title.code}
                  className="btn btn-secondary"
                  onClick={() => equipTitle(title.code)}
                  disabled={isUpdatingCosmetics}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    borderColor: user.activeCosmetics?.titleCode === title.code ? 'var(--accent)' : 'var(--border)',
                    background: user.activeCosmetics?.titleCode === title.code ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
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
                className={`flex flex-col items-center gap-2 px-2 py-3 border-2 border-[var(--overlay-border)] rounded-lg bg-transparent cursor-pointer transition-all duration-200 hover:border-accent hover:bg-white/[0.05] ${!user.activeCosmetics?.borderCode ? 'border-accent bg-[rgba(99,102,241,0.1)] shadow-[0_0_16px_rgba(99,102,241,0.2)]' : ''}`}
                onClick={() => equipBorder(null)}
                style={{ opacity: isUpdatingCosmetics ? 0.5 : 1 }}
              >
                <div className="w-11 h-11 rounded-full bg-transparent relative flex items-center justify-center">
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>{user.displayName.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-xs font-medium text-secondary text-center">Sin borde</span>
              </div>
              {inventory.borders?.map((border) => (
                <div
                  key={border.code}
                  className={`flex flex-col items-center gap-2 px-2 py-3 border-2 border-[var(--overlay-border)] rounded-lg bg-transparent cursor-pointer transition-all duration-200 hover:border-accent hover:bg-white/[0.05] ${user.activeCosmetics?.borderCode === border.code ? 'border-accent bg-[rgba(99,102,241,0.1)] shadow-[0_0_16px_rgba(99,102,241,0.2)]' : ''}`}
                  onClick={() => equipBorder(border.code)}
                  style={{ opacity: isUpdatingCosmetics ? 0.5 : 1 }}
                >
                  <div className="w-11 h-11 rounded-full bg-transparent relative flex items-center justify-center">
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>{user.displayName.charAt(0).toUpperCase()}</span>
                    <img src={resolveMediaUrl(border.imageUrl) || ''} alt="" className="absolute w-16 h-16 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="text-xs font-medium text-secondary text-center">{border.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
