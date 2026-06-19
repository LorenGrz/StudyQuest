import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MobileLayout } from '../components/Layouts'
import { Button, Spinner } from '../components/UI'
import { Countdown } from '../components/Countdown'
import { tournamentService, type Tournament } from '../services/tournamentService'
import { partyService } from '../services/partyService'


export default function TournamentsPage() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [activeParty, setActiveParty] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTournaments = async () => {
    try {
      const list = await tournamentService.getAll()
      setTournaments(list)
    } catch (err) {
      setError('Error al cargar la lista de torneos')
    }
  }

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      try {
        await fetchTournaments()
        const parties = await partyService.getMine()
        const active = parties.find((p) => p.status === 'active' || p.status === 'forming')
        setActiveParty(active)
      } catch (err) {
        setError('Error al inicializar la página')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const handleJoin = async (tournamentId: string) => {
    try {
      await tournamentService.join(tournamentId)
      await fetchTournaments()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al unirse al torneo')
    }
  }

  return (
    <MobileLayout>
      <motion.div
        className="p-4 flex flex-col gap-4 min-h-0"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-xl bg-surface border border-[var(--overlay-border)] flex items-center justify-center text-primary text-lg hover:bg-elevated transition-all cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black text-primary">🏆 Torneos Globales</h1>
            <p className="text-muted text-xs">Competí con tu party resolviendo quests en tiempo real</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center text-sm">
            {error}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🏆</span>
            <h3 className="text-primary font-bold text-sm">No hay torneos creados</h3>
            <p className="text-muted text-xs max-w-[280px] mt-1">
              Podés iniciar un torneo con una quest de tu materia desde el chat de tu party.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {tournaments.map((t) => {
              const hasJoined = t.participants?.some((p) => p.partyId === activeParty?.id)
              const participantCount = t.participants?.length ?? 0

              return (
                <div
                  key={t.id}
                  className="bg-surface border border-[var(--overlay-border)] rounded-lg p-4 flex flex-col gap-3 hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden group"
                >
                  {t.status === 'active' && (
                    <div className="absolute top-0 right-0 bg-accent text-primary text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-lg">
                      🔥 ACTIVO
                    </div>
                  )}
                  {t.status === 'finished' && (
                    <div className="absolute top-0 right-0 bg-input text-muted text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                      ✓ TERMINADO
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-primary font-bold text-base truncate pr-16">{t.title}</h3>
                    <p className="text-muted text-[11px]">
                      Quest: <span className="text-purple-400 font-semibold">{t.quest?.title ?? 'Quest generada'}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 border-y border-[var(--overlay-border)]">
                    <div className="flex flex-col min-w-0">
                      <span className="text-muted text-[11px] uppercase font-bold tracking-wider">Participantes</span>
                      <span className="text-primary font-semibold mt-0.5 truncate">👥 {participantCount} Partys</span>
                    </div>

                    <div className="flex flex-col text-right shrink-0 ml-2">
                      {t.status === 'pending' && (
                        <>
                          <span className="text-muted text-[11px] uppercase font-bold tracking-wider">Inicia en</span>
                          <Countdown targetDate={t.startsAt} onComplete={fetchTournaments} className="text-purple-400" />
                        </>
                      )}
                      {t.status === 'active' && (
                        <>
                          <span className="text-red-400 text-[11px] uppercase font-bold tracking-wider animate-pulse">Termina en</span>
                          <Countdown targetDate={t.endsAt} onComplete={fetchTournaments} />
                        </>
                      )}
                      {t.status === 'finished' && (
                        <>
                          <span className="text-muted text-[11px] uppercase font-bold tracking-wider">Estado</span>
                          <span className="text-muted font-semibold mt-0.5">Finalizado</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {t.status === 'pending' && (
                      <>
                        {hasJoined ? (
                          <div className="w-full text-center min-h-[44px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                            ✓ ¡Tu Party ya está inscripta!
                          </div>
                        ) : activeParty ? (
                          <Button className="w-full text-xs min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent rounded-lg" onClick={() => handleJoin(t.id)}>
                            ⚔️ Unirse con mi Party
                          </Button>
                        ) : (
                          <div className="w-full text-center min-h-[44px] text-muted bg-elevated border border-[var(--overlay-border)] rounded-lg text-xs font-semibold flex items-center justify-center">
                            Debés estar en una party para unirte
                          </div>
                        )}
                      </>
                    )}

                    {t.status === 'active' && (
                      <>
                        {hasJoined ? (
                          <Button
                            className="w-full text-xs min-h-[44px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                            onClick={() => navigate(`/tournament/${t.id}`)}
                          >
                            ⚡ Ver Scoreboard y Jugar
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="w-full text-xs min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                            onClick={() => navigate(`/tournament/${t.id}`)}
                          >
                            👁️ Ver Scoreboard en Vivo
                          </Button>
                        )}
                      </>
                    )}

                    {t.status === 'finished' && (
                      <Button
                        variant="secondary"
                        className="w-full text-xs min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                        onClick={() => navigate(`/tournament/${t.id}/results`)}
                      >
                        🏆 Ver Resultados Finales
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </MobileLayout>
  )
}
