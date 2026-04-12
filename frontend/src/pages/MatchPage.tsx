import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

  useEffect(() => { load() }, [load])

  const handleJoin = async (partyId: string) => {
    try {
      const party = await join(partyId)
      setActiveParty(party)
      navigate(`/party/${party.id}`)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No se pudo unir a la party')
    }
  }

  const handleDiscard = (partyId: string) => { discard(partyId) }

  const showCard = status === 'ready' && !!top

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
        {status === 'loading' && <LoadingState />}
        {status === 'error'   && <ErrorState message={error} onRetry={load} />}
        {status === 'empty'   && <EmptyState onCreateParty={() => navigate('/matchmaking')} />}
        {showCard && top      && <PartyCard party={top} />}
      </main>

      <ActionButtons
        onDiscard={() => top && handleDiscard(top.id)}
        onJoin={() => top && handleJoin(top.id)}
        disabled={!showCard}
      />

      <CreatePartyBar onPress={() => navigate('/matchmaking')} />

      <BottomNav />
    </div>
  )
}
