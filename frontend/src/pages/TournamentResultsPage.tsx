import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MobileLayout } from '../components/Layouts'
import { Button, Spinner } from '../components/UI'
import { tournamentService, type Tournament, type ScoreboardEntry } from '../services/tournamentService'
import { partyService } from '../services/partyService'

export default function TournamentResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([])
  const [myParty, setMyParty] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initData = async () => {
      if (!id) return
      try {
        const t = await tournamentService.getById(id)
        setTournament(t)
        
        const scores = await tournamentService.getScoreboard(id)
        setScoreboard(scores)
        
        const parties = await partyService.getMine()
        const active = parties.find((p) => p.status === 'active' || p.status === 'forming')
        setMyParty(active)
      } catch (err) {
        setError('Error al cargar los resultados del torneo')
      } finally {
        setIsLoading(false)
      }
    }
    initData()
  }, [id])

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      </MobileLayout>
    )
  }

  if (error || !tournament) {
    return (
      <MobileLayout>
        <div className="p-4 flex flex-col gap-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center text-sm">
            {error || 'Resultados no encontrados'}
          </div>
          <Button onClick={() => navigate('/tournaments')}>Volver a Torneos</Button>
        </div>
      </MobileLayout>
    )
  }

  const firstPlace = scoreboard[0] || null
  const secondPlace = scoreboard[1] || null
  const thirdPlace = scoreboard[2] || null
  const restEntries = scoreboard.slice(3)

  // Calcular recompensa del usuario actual
  const myPartyRank = scoreboard.findIndex((entry) => entry.partyId === myParty?.id) + 1
  const isMyPartyParticipating = myPartyRank > 0

  let xpReward = 0
  let coinsReward = 0

  if (isMyPartyParticipating) {
    if (myPartyRank === 1) {
      xpReward = 500
      coinsReward = 100
    } else if (myPartyRank === 2) {
      xpReward = 300
      coinsReward = 50
    } else if (myPartyRank === 3) {
      xpReward = 150
      coinsReward = 25
    } else {
      xpReward = 50
      coinsReward = 10
    }
  }

  return (
    <MobileLayout>
      <div className="p-4 flex flex-col gap-4 min-h-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tournaments')}
            className="w-10 h-10 rounded-xl bg-surface border border-white/8 flex items-center justify-center text-white text-lg hover:bg-elevated transition-all cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-white truncate max-w-[260px]">{tournament.title}</h1>
            <p className="text-muted text-[11px] uppercase font-bold tracking-wider">🏆 Resultados del Torneo</p>
          </div>
        </div>

        {/* PODIO ANIMADO */}
        <div className="flex items-end justify-center gap-3 pt-6 pb-2 shrink-0 border-b border-white/5">
          {/* 2nd Place */}
          {secondPlace && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
              className="flex flex-col items-center flex-1"
            >
              <span className="text-xl mb-1">🥈</span>
              <span className="text-[11px] font-bold text-muted truncate max-w-[80px]">{secondPlace.partyName}</span>
              <span className="text-[11px] text-muted">{secondPlace.score} pts</span>
              <div className="w-full h-20 bg-gradient-to-t from-elevated to-elevated border-t border-white/10 rounded-t-xl mt-2 flex items-center justify-center shadow-lg">
                <span className="text-white font-extrabold text-sm">#2</span>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {firstPlace && (
            <motion.div
              initial={{ y: 70, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              className="flex flex-col items-center flex-1 z-10"
            >
              <span className="text-3xl mb-1 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">👑</span>
              <span className="text-[11px] font-black text-yellow-400 truncate max-w-[90px]">{firstPlace.partyName}</span>
              <span className="text-[11px] text-yellow-400 font-bold">{firstPlace.score} pts</span>
              <div className="w-full h-28 bg-gradient-to-t from-[#4a3f1a] to-[#78350f] border-t border-yellow-500/30 rounded-t-2xl mt-2 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                <span className="text-yellow-400 font-black text-lg">#1</span>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {thirdPlace && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 100 }}
              className="flex flex-col items-center flex-1"
            >
              <span className="text-xl mb-1">🥉</span>
              <span className="text-[11px] font-bold text-[#b45309] truncate max-w-[80px]">{thirdPlace.partyName}</span>
              <span className="text-[11px] text-[#b45309]">{thirdPlace.score} pts</span>
              <div className="w-full h-14 bg-gradient-to-t from-[#271c19] to-[#451a03] border-t border-orange-500/10 rounded-t-xl mt-2 flex items-center justify-center shadow-lg">
                <span className="text-orange-400 font-extrabold text-xs">#3</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* RECOMPENSAS OBTENIDAS */}
        {isMyPartyParticipating ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-br from-purple-950/30 to-indigo-950/30 border border-purple-500/40 p-4 rounded-3xl flex flex-col gap-2 items-center text-center shrink-0"
          >
            <span className="text-accent-light text-[11px] font-bold uppercase tracking-widest">Recompensa Obtenida</span>
            <h4 className="text-white font-extrabold text-sm">Puesto #{myPartyRank} en el Podio</h4>
            
            <div className="flex gap-4 mt-1">
              <div className="bg-purple-500/15 border border-purple-500/30 px-3 py-2 rounded-2xl flex items-center gap-1.5 shadow-lg">
                <span className="text-base">✨</span>
                <span className="text-white font-black text-xs">+{xpReward} XP</span>
              </div>
              <div className="bg-yellow-500/15 border border-yellow-500/30 px-3 py-2 rounded-2xl flex items-center gap-1.5 shadow-lg">
                <span className="text-base">🪙</span>
                <span className="text-white font-black text-xs">+{coinsReward} Monedas</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-surface border border-white/5 p-4 rounded-3xl text-center text-xs text-muted shrink-0">
            No participaste en este torneo. ¡Prepárate para la próxima!
          </div>
        )}

        {/* HISTORIAL RESTO DE POSICIONES */}
        {restEntries.length > 0 && (
          <div className="flex-1 flex flex-col gap-2.5 min-h-0 bg-surface border border-white/8 rounded-3xl p-4">
            <h3 className="text-muted text-xs font-bold uppercase tracking-wider">Otras posiciones</h3>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
              {restEntries.map((entry) => (
                <div
                  key={entry.partyId}
                  className="flex items-center justify-between p-2.5 bg-elevated/40 border border-white/5 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-muted font-bold w-6 shrink-0">#{entry.rank}</span>
                    <span className="text-white font-semibold truncate">{entry.partyName}</span>
                  </div>
                  <span className="text-white font-bold shrink-0 ml-2">{entry.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="w-full text-xs font-bold py-2.5 mt-2" onClick={() => navigate('/tournaments')}>
          Volver a Torneos
        </Button>
      </div>
    </MobileLayout>
  )
}
