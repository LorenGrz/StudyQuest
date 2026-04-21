import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useMatch } from '../hooks/useMatch'
import { usePartyStore } from '../store/partyStore'
import { BottomNav } from '../components/Layouts'
import {
  PartyCard,
  ActionButtons,
  LoadingState,
  ErrorState,
  EmptyState,
  CreatePartyBar,
} from '../components/MatchComponents'

export default function MatchPage() {
  const navigate = useNavigate()
  const { setActiveParty } = usePartyStore()
  const { top, status, error, load, discard, join } = useMatch()

  const [exitDir, setExitDir] = useState<number>(0)

  useEffect(() => { load() }, [load])

  // Motion setup
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-250, 250], [-20, 20])
  const opacity = useTransform(x, [-250, 0, 250], [0.5, 1, 0.5])

  const handleJoin = async (partyId: string, programmatic = false) => {
    if (programmatic) setExitDir(1)
    setTimeout(async () => {
      try {
        const party = await join(partyId)
        setActiveParty(party)
        navigate(`/party/${party.id}`)
      } catch (err: any) {
        alert(err?.response?.data?.message ?? 'No se pudo unir a la party')
        load() // Recargar si falló
      }
    }, programmatic ? 200 : 0)
  }

  const handleDiscard = (partyId: string, programmatic = false) => {
    if (programmatic) setExitDir(-1)
    setTimeout(() => {
      discard(partyId)
      setExitDir(0)
      x.set(0)
    }, programmatic ? 200 : 0)
  }

  const handleDragEnd = (_e: any, info: { offset: { x: number } }) => {
    const threshold = 120
    if (info.offset.x > threshold) {
      setExitDir(1)
      handleJoin(top!.id)
    } else if (info.offset.x < -threshold) {
      setExitDir(-1)
      handleDiscard(top!.id)
    }
  }

  const showCard = status === 'ready' && !!top

  // Variants para exit animation
  const cardVariants = {
    enter: { scale: 0.95, opacity: 0, y: 20 },
    center: { scale: 1, opacity: 1, y: 0, x: 0, rotate: 0 },
    exit: (dir: number) => {
      const finalDir = dir !== 0 ? dir : (x.get() > 0 ? 1 : -1)
      return {
        x: finalDir * 350,
        opacity: 0,
        rotate: finalDir * 25,
        transition: { duration: 0.3 }
      }
    }
  }

  return (
    <div className="mc-page">
      <header className="mc-header">
        <h1 className="mc-header-title">Party Discovery</h1>
        <button className="mc-filter-btn" aria-label="Filtros">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
        </button>
      </header>

      <main className="mc-deck">
        <AnimatePresence mode="popLayout" custom={exitDir}>
          {status === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingState />
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState message={error} onRetry={load} />
            </motion.div>
          )}
          {status === 'empty' && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
              className="mc-swipe-wrap"
            >
              <PartyCard party={top} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ActionButtons
        onDiscard={() => top && handleDiscard(top.id, true)}
        onJoin={() => top && handleJoin(top.id, true)}
        disabled={!showCard}
      />

      <CreatePartyBar onPress={() => navigate('/parties')} />

      <BottomNav />
    </div>
  )
}
