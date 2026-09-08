import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Spinner, Button, Modal } from '../../components/UI'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
}

interface ProfileMedalsProps {
  achievements: Achievement[]
  loading: boolean
}

function MedalTile({ a }: { a: Achievement }) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-lg border border-[var(--overlay-border)] bg-surface text-center transition-all duration-200 cursor-default ${
        a.unlocked
          ? 'border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.06)] shadow-[0_0_12px_rgba(124,58,237,0.15)]'
          : 'opacity-60 grayscale-[0.8]'
      }`}
      title={`${a.unlocked ? '' : '🔒 '}${a.name} — ${a.description}`}
    >
      <span className="text-[28px] leading-none">{a.icon}</span>
      <span className="text-[11px] font-semibold text-secondary leading-[1.3] line-clamp-2">
        {a.name}
      </span>
    </div>
  )
}

export function ProfileMedals({ achievements, loading }: ProfileMedalsProps) {
  const [open, setOpen] = useState(false)
  const [showLocked, setShowLocked] = useState(false)

  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)

  return (
    <section>
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-base font-bold text-secondary uppercase tracking-[1px]">
          Medallas
        </h3>
        {!loading && achievements.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Ver todas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[80px]">
          <Spinner size="sm" />
        </div>
      ) : (
        <button
          onClick={() => achievements.length > 0 && setOpen(true)}
          className="w-full flex items-center gap-3 bg-surface border border-[var(--overlay-border)] rounded-lg p-4 text-left transition-colors hover:bg-elevated disabled:cursor-default disabled:hover:bg-surface"
          disabled={achievements.length === 0}
        >
          {unlocked.length > 0 ? (
            <div className="flex items-center gap-1">
              {unlocked.slice(0, 6).map((a) => (
                <span key={a.id} className="text-[22px] leading-none">
                  {a.icon}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted">
              Todavía no ganaste medallas
            </span>
          )}
          <span className="ml-auto text-sm font-bold text-primary shrink-0">
            {unlocked.length}/{achievements.length}
          </span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <Modal
            title={`Medallas · ${unlocked.length}/${achievements.length}`}
            size="lg"
            onClose={() => setOpen(false)}
          >
            {unlocked.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2.5">
                {unlocked.map((a) => (
                  <MedalTile key={a.id} a={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-4">
                Todavía no ganaste ninguna medalla. Completá quests y subí de
                liga para desbloquearlas.
              </p>
            )}

            {locked.length > 0 && (
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowLocked((v) => !v)}
                >
                  {showLocked
                    ? 'Ocultar no obtenidas'
                    : `Ver no obtenidas (${locked.length})`}
                </Button>
                <AnimatePresence>
                  {showLocked && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2.5 mt-3">
                      {locked.map((a) => (
                        <MedalTile key={a.id} a={a} />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </section>
  )
}
