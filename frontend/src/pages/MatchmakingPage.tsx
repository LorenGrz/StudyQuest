import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FullscreenLayout } from '../components/Layouts'
import {
  SubjectSelector,
  SearchAnimation,
  PartyPreview,
  WaitingForAll,
} from '../components/MatchmakingComponents'
import { useSocket } from '../hooks/useSocket'
import { useAuthStore } from '../store/authStore'
import { usePartyStore } from '../store/partyStore'
import type { Party } from '../services/partyService'

type MatchState = 'idle' | 'searching' | 'found' | 'confirming' | 'ready'

const MatchmakingPage = () => {
  const [state, setState] = useState<MatchState>('idle')
  const [foundParty, setFoundParty] = useState<any>(null)
  const [matchId, setMatchId] = useState<string>('')
  const [confirmed, setConfirmed] = useState(0)
  const { socket } = useSocket()
  const { user } = useAuthStore()
  const { setActiveParty } = usePartyStore()
  const navigate = useNavigate()

  useEffect(() => {
    socket.on('match:found', (party: any) => {
      setFoundParty(party)
      setMatchId(party?.matchId ?? '')
      setState('found')
    })

    socket.on('match:confirmed', ({ count }: { count: number }) => {
      setConfirmed(count)
    })

    socket.on('match:ready', (payload: any) => {
      const party: Party = payload?.party ?? payload
      const partyId: string = payload?.partyId ?? party?.id
      if (!partyId) return
      setActiveParty(party)
      navigate(`/party/${partyId}`)
    })

    return () => {
      socket.off('match:found')
      socket.off('match:confirmed')
      socket.off('match:ready')
    }
  }, [socket, navigate, setActiveParty])

  const startSearch = () => {
    socket.emit('match:join-queue', {
      subjectIds: user?.enrolledSubjects?.map((s) => s.id) ?? [],
      availability: [],
      preferredPartySize: 4,
    })
    setState('searching')
  }

  const cancelSearch = () => {
    socket.emit('match:leave-queue')
    setState('idle')
  }

  return (
    <FullscreenLayout>
      {state === 'idle' && (
        <SubjectSelector onConfirm={startSearch} user={user} />
      )}
      {state === 'searching' && (
        <div>
          <SearchAnimation />
          <button className="link-btn" style={{ marginTop: '2rem' }} onClick={cancelSearch}>
            Cancelar
          </button>
        </div>
      )}
      {state === 'found' && (
        <PartyPreview
          party={foundParty}
          onAccept={() => {
            socket.emit('match:accept', { matchId })
            setState('confirming')
          }}
        />
      )}
      {state === 'confirming' && (
        <WaitingForAll confirmed={confirmed} total={foundParty?.memberCount ?? foundParty?.members?.length ?? 4} />
      )}
    </FullscreenLayout>
  )
}

export default MatchmakingPage
