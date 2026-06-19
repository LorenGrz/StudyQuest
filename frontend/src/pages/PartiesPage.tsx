import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { Spinner, Badge, Button } from '../components/UI'
import { PageContainer, PageHeader, EmptyState } from '../components/PagePrimitives'
import { partyService, type Party } from '../services/partyService'
import { useAuthStore } from '../store/authStore'

const PartiesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [parties, setParties] = useState<Party[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [isPrivate, setIsPrivate] = useState(false)

  const subjects = user?.enrolledSubjects ?? []

  useEffect(() => {
    let mounted = true
    partyService.getMine()
      .then((data) => {
        if (mounted) {
          setParties(data)
          setIsLoading(false)
        }
      })
      .catch((error) => {
        console.error('Error fetching parties', error)
        if (mounted) setIsLoading(false)
      })
    return () => { mounted = false }
  }, [])

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const newParty = await partyService.create(selectedSubjectId || undefined, 4, isPrivate)
      navigate(`/party/${newParty.id}`)
    } catch (err) {
      console.error('Error al crear party', err)
      setIsCreating(false)
      setShowModal(false)
    }
  }

  const getStatusBadge = (status: Party['status']) => {
    switch (status) {
      case 'active':   return <Badge variant="success">Activa</Badge>
      case 'forming':  return <Badge variant="warning">Formando</Badge>
      case 'waiting':  return <Badge variant="warning">En espera</Badge>
      case 'closed':   return <Badge variant="neutral">Cerrada</Badge>
    }
  }

  return (
    <MobileLayout>
      <PageContainer>
        <PageHeader
          title="Mis Parties"
          back={() => navigate('/dashboard')}
          action={
            <Button size="sm" variant="primary" onClick={() => setShowModal(true)}>
              + Crear
            </Button>
          }
        />

        {/* Modal crear party */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <div className="w-full max-w-sm bg-bg-elevated border border-edge rounded-xl p-6 flex flex-col gap-5">
              <h2 className="text-xl font-bold text-primary">🎮 Nueva Party</h2>

              {subjects.length > 0 ? (
                <div className="input-group">
                  <label className="input-label">Materia (opcional — por defecto tu primera materia)</label>
                  <select
                    className="input input-select"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                  >
                    <option value="">— Auto (primera materia) —</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-secondary">
                  ⚠️ No tenés materias inscriptas. Inscribite primero desde Explorar.
                </p>
              )}

              <label
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setIsPrivate(!isPrivate)}
              >
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(!isPrivate)}
                  className="w-[18px] h-[18px] cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold text-primary">Party Privada 🔒</span>
                  <span className="text-xs text-secondary">No aparecerá en Match. Solo se unen con link.</span>
                </div>
              </label>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={isCreating || subjects.length === 0}
                >
                  {isCreating ? 'Creando…' : 'Crear Party'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : parties.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Aún no tenés parties"
            description="Creá una nueva o buscá desde Match"
            action={
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={() => navigate('/match')}>Buscar Party</Button>
                <Button variant="primary" onClick={() => setShowModal(true)}>+ Crear</Button>
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {parties.map(party => (
              <div
                key={party.id}
                className="flex items-center justify-between gap-3 bg-surface border border-edge rounded-lg px-4 py-3 cursor-pointer hover:border-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => navigate(`/party/${party.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/party/${party.id}`) }}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-primary text-sm truncate">
                    {party.subject?.name ?? 'Party'}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
                    <span>👥 {party.members?.length || 0}/{party.maxMembers} miembros</span>
                    <span aria-hidden="true">•</span>
                    {getStatusBadge(party.status)}
                  </div>
                </div>
                <span className="shrink-0 text-secondary text-lg" aria-hidden="true">›</span>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </MobileLayout>
  )
}

export default PartiesPage
