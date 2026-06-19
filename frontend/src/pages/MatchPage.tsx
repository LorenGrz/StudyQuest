import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import {
  ActionButtons,
  CreatePartyBar,
  EmptyState,
  ErrorState,
  LoadingState,
  PartyCard,
} from '../components/MatchComponents'
import { useMatch } from '../hooks/useMatch'
import { usePartyStore } from '../store/partyStore'
import { MobileLayout } from '../components/Layouts'

export default function MatchPage() {
  const navigate = useNavigate()
  const { setActiveParty } = usePartyStore()
  const { parties, top, status, error, load, discard, join } = useMatch()
  const [exitDir, setExitDir] = useState(0)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-250, 250], [-20, 20])
  const opacity = useTransform(x, [-250, 0, 250], [0.5, 1, 0.5])

  useEffect(() => {
    load()
  }, [load])

  const handleJoin = async (partyId: string, programmatic = false) => {
    if (programmatic) setExitDir(1)
    try {
      const party = await join(partyId)
      setActiveParty(party)
      navigate(`/party/${party.id}`)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No se pudo unir a la party')
      load()
    }
  }

  const handleDiscard = (partyId: string, programmatic = false) => {
    if (programmatic) setExitDir(-1)
    discard(partyId)
    setExitDir(0)
    x.set(0)
  }

  const handleDragEnd = (_e: any, info: { offset: { x: number } }) => {
    if (!top) return

    const threshold = 120
    if (info.offset.x > threshold) {
      handleJoin(top.id)
    } else if (info.offset.x < -threshold) {
      handleDiscard(top.id)
    }
  }

  const showCard = status === 'ready' && !!top

  const subtitleByStatus = {
    idle: 'Cargando parties compatibles',
    loading: 'Buscando parties compatibles',
    ready: `${parties.length} party${parties.length === 1 ? '' : 's'} disponible${parties.length === 1 ? '' : 's'}`,
    empty: 'No hay parties disponibles por ahora',
    error: error ?? 'No pudimos cargar las parties',
  }[status]

  const cardVariants = {
    enter: { scale: 0.95, opacity: 0, y: 20 },
    center: { scale: 1, opacity: 1, y: 0, x: 0, rotate: 0 },
    exit: (dir: number) => {
      const finalDir = dir !== 0 ? dir : (x.get() > 0 ? 1 : -1)
      return {
        x: finalDir * 350,
        opacity: 0,
        rotate: finalDir * 25,
        transition: { duration: 0.3 },
      }
    },
  }

  return (
    <MobileLayout>
    <div className="w-full max-w-[480px] mx-auto self-center h-full flex flex-col bg-base overflow-hidden">
      
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2.5 shrink-0">
        <div>
          <h1 className="text-[22px] font-extrabold text-white">Party Discovery</h1>
          <p className="text-[13px] text-muted mt-1">{subtitleByStatus}</p>
        </div>
        <button 
          className="w-[38px] h-[38px] rounded-xl bg-surface border border-white/8 flex items-center justify-center text-muted transition-all duration-200 hover:border-purple-500 hover:text-purple-400 active:scale-95" 
          aria-label="Filtros"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
        </button>
      </header>

      {/* Main Deck Container */}
      <main className="flex-1 min-h-0 flex items-stretch justify-center px-10 py-[18px] overflow-hidden relative">
        <AnimatePresence mode="popLayout" custom={exitDir}>
          {(status === 'idle' || status === 'loading') && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center w-full">
              <LoadingState />
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center w-full">
              <ErrorState message={error} onRetry={load} />
            </motion.div>
          )}

          {status === 'empty' && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center w-full">
              <EmptyState onCreateParty={() => navigate('/parties')} />
            </motion.div>
          )}

          {showCard && top && (
            <motion.div
              key={top.id}
              custom={exitDir}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ x, rotate, opacity }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={handleDragEnd}
              whileTap={{ cursor: 'grabbing', scale: 0.98 }}
              className="w-full max-w-[440px] h-full flex flex-col justify-center select-none touch-none cursor-grab active:cursor-grabbing"
            >
              <PartyCard party={top} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Control Buttons */}
      <ActionButtons
        onDiscard={() => top && handleDiscard(top.id, true)}
        onJoin={() => top && handleJoin(top.id, true)}
        disabled={!showCard}
      />

      {/* Create Party Banner */}
      <CreatePartyBar onPress={() => navigate('/parties')} />

    </div>
    </MobileLayout>
  )
}
