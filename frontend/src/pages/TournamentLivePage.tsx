import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { Button, Spinner } from '../components/UI'
import { useSocket } from '../hooks/useSocket'
import { tournamentService, type Tournament, type ScoreboardEntry } from '../services/tournamentService'
import { partyService } from '../services/partyService'

const Countdown = ({ targetDate, onComplete }: { targetDate: string; onComplete?: () => void }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(targetDate).getTime() - Date.now()
      if (difference <= 0) {
        setTimeLeft('00:00')
        onComplete?.()
        return
      }

      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      setTimeLeft(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)

    return () => clearInterval(timer)
  }, [targetDate, onComplete])

  return <span className="font-mono text-xl text-red-500 font-extrabold tracking-wider">{timeLeft}</span>
}

export default function TournamentLivePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { socket } = useSocket()
  
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([])
  const [myParty, setMyParty] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setError('Error al cargar la información del torneo')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    initData()
  }, [id])

  useEffect(() => {
    if (!socket || !id) return

    socket.emit('tournament:join', { tournamentId: id })

    socket.on('tournament_score_update', (data: { tournamentId: string; scoreboard: ScoreboardEntry[] }) => {
      if (data.tournamentId === id) {
        setScoreboard(data.scoreboard)
      }
    })

    socket.on('tournament_ended', (data: { tournamentId: string }) => {
      if (data.tournamentId === id) {
        navigate(`/tournament/${id}/results`)
      }
    })

    return () => {
      socket.emit('tournament:leave', { tournamentId: id })
      socket.off('tournament_score_update')
      socket.off('tournament_ended')
    }
  }, [socket, id])

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
            {error || 'Torneo no encontrado'}
          </div>
          <Button onClick={() => navigate('/tournaments')}>Volver a Torneos</Button>
        </div>
      </MobileLayout>
    )
  }

  const isMyPartyParticipating = tournament.participants?.some((p) => p.partyId === myParty?.id)

  return (
    <MobileLayout>
      <div className="p-4 flex flex-col gap-4 min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/tournaments')}
              className="w-10 h-10 rounded-xl bg-surface border border-white/8 flex items-center justify-center text-white text-lg hover:bg-elevated transition-all cursor-pointer"
            >
              ←
            </button>
            <div>
              <h1 className="text-base font-black text-white truncate max-w-[200px]">{tournament.title}</h1>
              <p className="text-muted text-[11px] uppercase font-bold tracking-wider">🔴 COMPETENCIA EN VIVO</p>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/25 px-3 py-1.5 rounded-2xl flex flex-col items-center shrink-0">
            <span className="text-[#ff5c5c] text-[11px] font-bold uppercase tracking-wider">Tiempo Restante</span>
            <Countdown targetDate={tournament.endsAt} onComplete={() => navigate(`/tournament/${id}/results`)} />
          </div>
        </div>

        {isMyPartyParticipating ? (
          <div className="bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-500/30 p-4 rounded-3xl flex flex-col gap-3 relative overflow-hidden shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white font-extrabold text-sm">¡Tu Party está compitiendo!</h4>
                <p className="text-accent-light text-[11px] mt-0.5">Resolvé la quest para acumular puntos.</p>
              </div>
              <span className="text-xl">⚡</span>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs py-2.5 font-bold shadow-[0_0_15px_rgba(124,58,237,0.5)]"
              onClick={() => navigate(`/quiz/${tournament.questId}`)}
            >
              ⚔️ RESOLVER QUEST AHORA
            </Button>
          </div>
        ) : (
          <div className="bg-surface border border-white/5 p-4 rounded-3xl text-center text-xs text-muted shrink-0">
            Estás viendo este torneo en modo espectador ya que tu party no se inscribió.
          </div>
        )}

        <div className="flex-1 flex flex-col gap-3 min-h-0 bg-surface border border-white/8 rounded-3xl p-4">
          <h3 className="text-muted text-xs font-bold uppercase tracking-wider">📊 Tabla de Posiciones</h3>
          
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {scoreboard.length === 0 ? (
              <div className="text-center py-10 text-muted text-xs">
                No hay parties participando o aún nadie ha puntuado.
              </div>
            ) : (
              scoreboard.map((entry, idx) => {
                const isMyEntry = entry.partyId === myParty?.id
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                
                return (
                  <div
                    key={entry.partyId}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 border ${
                      isMyEntry
                        ? 'bg-purple-950/20 border-purple-500/35 shadow-[0_0_10px_rgba(124,58,237,0.15)]'
                        : 'bg-elevated/50 border-white/5 hover:bg-elevated'
                    }`}
                  >
                    <div className="w-6 text-center font-black text-sm text-muted">
                      {medal ? <span className="text-base">{medal}</span> : <span>#{entry.rank}</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isMyEntry ? 'text-purple-400' : 'text-white'}`}>
                        {entry.partyName}
                      </p>
                      {isMyEntry && <p className="text-[11px] text-accent-light font-semibold">Tu Party</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-white">{entry.score} pts</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}
