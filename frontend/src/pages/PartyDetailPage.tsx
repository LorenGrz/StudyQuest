import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { partyService, type Party } from '../services/partyService'
import { Button, Spinner } from '../components/UI'
import { PageContainer, PageHeader } from '../components/PagePrimitives'
import {
  getCoverImageUrl,
  getSubjectIcon,
  MemberAvatar,
  getSlotsRemaining,
  getActiveQuest,
  ProgressBar,
} from '../components/match/MatchComponents'
import { useAuthStore } from '../store/authStore'
import { usePartyStore } from '../store/partyStore'
import { motion } from 'framer-motion'

export default function PartyDetailPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setActiveParty } = usePartyStore()
  const [party, setParty] = useState<Party | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    if (!partyId) return
    let mounted = true
    setIsLoading(true)
    setError(null)
    partyService.findById(partyId)
      .then((data) => {
        if (mounted) {
          setParty(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error('Error fetching party details:', err)
        if (mounted) {
          setError('No pudimos cargar los detalles de este grupo de estudio.')
          setIsLoading(false)
        }
      })
    return () => { mounted = false }
  }, [partyId])

  const handleJoin = async () => {
    if (!partyId) return
    setIsJoining(true)
    try {
      const joinedParty = await partyService.join(partyId)
      setActiveParty(joinedParty)
      navigate(`/party/${partyId}`)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No se pudo unir a la party')
      setIsJoining(false)
    }
  }

  const handleGoToChat = () => {
    if (party) {
      setActiveParty(party)
      navigate(`/party/${party.id}`)
    }
  }

  if (isLoading) {
    return (
      <MobileLayout>
        <PageContainer>
          <PageHeader title="Detalles" back={() => navigate(-1)} />
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-secondary">Obteniendo detalles del grupo...</p>
          </div>
        </PageContainer>
      </MobileLayout>
    )
  }

  if (error || !party) {
    return (
      <MobileLayout>
        <PageContainer>
          <PageHeader title="Detalles" back={() => navigate(-1)} />
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
            <span className="text-4xl">⚠️</span>
            <p className="text-secondary text-sm">{error || 'Party no encontrada.'}</p>
            <Button variant="primary" onClick={() => navigate(-1)}>Volver</Button>
          </div>
        </PageContainer>
      </MobileLayout>
    )
  }

  const isMember = party.members?.some((m) => m.userId === user?.id)
  const slotsLeft = getSlotsRemaining(party)
  const coverUrl = getCoverImageUrl(party.subject?.name, party.id)
  const subjectIcon = getSubjectIcon(party.subject?.name)
  const quest = getActiveQuest(party)
  
  const progressPct = quest ? Math.min(95, Math.max(10,
    (party.members?.length ?? 1) * 15
  )) : 0

  return (
    <MobileLayout>
      <PageContainer>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col flex-1 pb-10 gap-5"
        >
          <PageHeader title="Detalles de la Party" back={() => navigate(-1)} />

          {/* Cover a gran escala */}
          <div className="w-full h-52 relative rounded-2xl overflow-hidden shadow-lg border border-edge shrink-0">
            <img
              className="absolute inset-0 w-full h-full object-cover object-center"
              src={coverUrl}
              alt={party.subject?.name ?? 'Party cover'}
            />
            {/* Gradientes e iluminación */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d18]/95 via-black/40 to-transparent" />
            
            {/* Chip de materia flotante */}
            <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-black/55 backdrop-blur-md border border-[var(--overlay-border)] rounded-full px-3 py-1.25 text-[11px] font-bold text-primary uppercase tracking-[0.6px]">
              <span className="text-[13px]">{subjectIcon}</span>
              {party.subject?.code ?? party.subject?.name ?? 'STUDY'}
            </div>

            {/* Información en la imagen */}
            <div className="absolute bottom-4 left-4 right-4 text-left">
              <h2 className="text-xl font-bold text-primary drop-shadow-md line-clamp-1">
                {party.name ?? party.subject?.name ?? 'Grupo de Estudio'}
              </h2>
              <p className="text-xs text-secondary mt-1 font-semibold">
                Materia: <span className="text-accent-light">{party.subject?.name}</span>
              </p>
            </div>
          </div>

          {/* Información General */}
          <div className="bg-surface border border-edge rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-[0.8px]">Información del Grupo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-input/40 border border-edge/30 rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-muted uppercase">Estado</span>
                <span className="text-sm font-semibold text-primary">
                  {party.status === 'active' ? '🟢 Activa' : party.status === 'waiting' ? '🟡 Esperando' : party.status === 'forming' ? '🟡 Armando' : '🔴 Cerrada'}
                </span>
              </div>
              <div className="bg-input/40 border border-edge/30 rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-muted uppercase">Visibilidad</span>
                <span className="text-sm font-semibold text-primary">
                  {party.isPrivate ? '🔒 Privada' : '🌎 Pública'}
                </span>
              </div>
            </div>
          </div>

          {/* Quest Activa */}
          <div className="bg-surface border border-edge rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-[0.8px]">Quest en Curso</h3>
              {quest && (
                <span className="text-[10px] font-bold text-blue-400">
                  {progressPct}% COMPLETADO
                </span>
              )}
            </div>
            {quest ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-primary">{quest.title}</span>
                  <span className="text-xs text-muted mt-0.5">Generada por IA de StudyQuest</span>
                </div>
                <ProgressBar pct={progressPct} />
              </div>
            ) : (
              <p className="text-xs text-muted text-left py-1">No hay quests activas en este momento.</p>
            )}
          </div>

          {/* Listado de Miembros */}
          <div className="bg-surface border border-edge rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-[0.8px]">Miembros del Grupo</h3>
              <span className="text-xs font-bold text-muted">
                {party.members?.length ?? 0}/{party.maxMembers ?? 4}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {party.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-input/20 border border-edge/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <MemberAvatar member={member} size={38} />
                      <div className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${member.isOnline ? 'bg-success shadow-[0_0_4px_var(--green)]' : 'bg-muted'}`} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-primary flex items-center gap-1.5">
                        {member.user?.username ?? 'Estudiante'}
                        {member.role === 'leader' && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.5 py-0.25">👑 Líder</span>
                        )}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">Nivel {member.user?.stats?.level ?? 0}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-faint bg-input border border-edge/30 rounded px-2 py-0.5 uppercase tracking-[0.4px]">
                    {member.partyXp ?? 0} XP
                  </div>
                </div>
              ))}
              {(!party.members || party.members.length === 0) && (
                <p className="text-xs text-muted py-2 text-center">No hay miembros en este grupo.</p>
              )}
            </div>
          </div>

          {/* Botón de Acción Principal */}
          <div className="mt-1 flex flex-col gap-2">
            {isMember ? (
              <Button
                variant="primary"
                onClick={handleGoToChat}
                className="w-full min-h-[3rem] text-sm font-semibold flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <span>Ir al Chat del Grupo 💬</span>
              </Button>
            ) : slotsLeft > 0 ? (
              <Button
                variant="primary"
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full min-h-[3rem] text-sm font-semibold flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                {isJoining ? (
                  <>
                    <Spinner size="sm" />
                    <span>Uniéndose al grupo...</span>
                  </>
                ) : (
                  <>
                    <span>Unirse a esta Party 🤝</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled
                className="w-full min-h-[3rem] text-sm font-semibold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                <span>Grupo Completo 🔒</span>
              </Button>
            )}
          </div>
        </motion.div>
      </PageContainer>
    </MobileLayout>
  )
}
