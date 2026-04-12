import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePartySlide } from '../hooks/usePartySlide'
import { usePartyStore } from '../store/partyStore'

export default function PartySlidePage() {
  const navigate = useNavigate()
  const { setActiveParty } = usePartyStore()
  const { top, status, error, load, discard, join } = usePartySlide()

  useEffect(() => {
    load()
  }, [load])

  const handleJoin = async (partyId: string) => {
    try {
      const party = await join(partyId)
      setActiveParty(party)
      navigate(`/party/${party.id}`)
    } catch (err: any) {
      // En issues siguientes se manejará con toast/feedback visual
      alert(err?.response?.data?.message ?? 'No se pudo unir a la party')
    }
  }

  const handleDiscard = (partyId: string) => {
    discard(partyId)
  }

  return (
    <div className="discovery-page">
      {/* Header */}
      <div className="discovery-header">
        <h1 className="discovery-title">Party Discovery</h1>
        <button className="discovery-filter-btn" aria-label="Filtros">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* Contenido central */}
      <div className="discovery-deck">
        {status === 'loading' && (
          <div className="discovery-state">
            <div className="discovery-spinner" />
            <p>Buscando parties para vos...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="discovery-state">
            <span className="discovery-state-icon">⚠️</span>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={load}>Reintentar</button>
          </div>
        )}

        {status === 'empty' && (
          <div className="discovery-state">
            <span className="discovery-state-icon">🎉</span>
            <h2>¡Ya recorriste todo!</h2>
            <p>No hay más squads disponibles en tus materias.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/matchmaking')}
            >
              ⚡ Crear mi party
            </button>
          </div>
        )}

        {status === 'ready' && top && (
          <div className="party-card-placeholder">
            {/* PartyCard se implementa en Issue 3 */}
            <div className="party-card-stub">
              <div className="party-card-stub-subject">{top.subject?.name ?? 'Materia desconocida'}</div>
              <div className="party-card-stub-members">
                {top.members?.length ?? 0} / {top.maxMembers} miembros
              </div>
              <div className="party-card-stub-status">{top.status}</div>
            </div>
          </div>
        )}
      </div>

      {/* Botones de acción (solo visibles cuando hay una card) */}
      {status === 'ready' && top && (
        <div className="discovery-actions">
          <button
            className="discovery-action-btn discovery-action-discard"
            onClick={() => handleDiscard(top.id)}
            aria-label="Descartar party"
          >
            ✕
          </button>
          <button
            className="discovery-action-btn discovery-action-undo"
            aria-label="Deshacer"
            disabled
          >
            ↺
          </button>
          <button
            className="discovery-action-btn discovery-action-join"
            onClick={() => handleJoin(top.id)}
            aria-label="Unirse a party"
          >
            ⚡
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="discovery-footer">
        <span className="discovery-footer-icon">＋</span>
        <span className="discovery-footer-text">¿No encontrás tu match?</span>
        <button
          className="discovery-footer-cta"
          onClick={() => navigate('/matchmaking')}
        >
          CREAR PARTY
        </button>
      </div>
    </div>
  )
}
