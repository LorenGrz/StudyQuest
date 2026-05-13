import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { Spinner, Badge, Button } from '../components/UI'
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
  const [partyType, setPartyType] = useState<'quiz' | 'study'>('quiz')

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
      const newParty = await partyService.create(selectedSubjectId || undefined, 4, isPrivate, partyType)
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard')}>
            ← Volver
          </Button>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Mis Parties</h1>
        </div>
        <Button size="sm" variant="primary" onClick={() => setShowModal(true)}>
          + Crear
        </Button>
      </div>

      {/* Modal crear party */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            width: '100%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>🎮 Nueva Party</h2>

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
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                ⚠️ No tenés materias inscriptas. Inscribite primero desde Explorar.
              </p>
            )}

            <div className="input-group">
              <label className="input-label">Modo de la Party</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  variant={partyType === 'quiz' ? 'primary' : 'secondary'} 
                  onClick={() => setPartyType('quiz')}
                  className="flex-1"
                >
                  ⚡ Quiz
                </Button>
                <Button 
                  variant={partyType === 'study' ? 'primary' : 'secondary'} 
                  onClick={() => setPartyType('study')}
                  className="flex-1"
                >
                  ⏱️ Study Room
                </Button>
              </div>
            </div>

            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsPrivate(!isPrivate)}>
              <input 
                type="checkbox" 
                checked={isPrivate} 
                onChange={() => setIsPrivate(!isPrivate)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Party Privada 🔒</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No aparecerá en Match. Solo se unen con link.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
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
        <div className="center-spinner">
          <Spinner size="lg" />
        </div>
      ) : parties.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">👥</p>
          <p className="empty-text">Aún no tenés parties</p>
          <p className="empty-sub">Creá una nueva o buscá desde Match</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => navigate('/match')}>Buscar Party</Button>
            <Button variant="primary" onClick={() => setShowModal(true)}>+ Crear</Button>
          </div>
        </div>
      ) : (
        <div className="party-list">
          {parties.map(party => (
            <div
              key={party.id}
              className="party-list-item"
              onClick={() => navigate(`/party/${party.id}`)}
            >
              <div className="party-list-info">
                <div className="party-list-name">
                  {party.subject?.name ?? 'Party'}
                </div>
                <div className="party-list-meta">
                  <span>{party.type === 'study' ? '⏱️ Study Room' : '⚡ Quiz'}</span>
                  <span>•</span>
                  <span>👥 {party.members?.length || 0}/{party.maxMembers} miembros</span>
                  <span>•</span>
                  {getStatusBadge(party.status)}
                </div>
              </div>
              <div className="party-list-arrow">›</div>
            </div>
          ))}
        </div>
      )}
    </MobileLayout>
  )
}

export default PartiesPage
