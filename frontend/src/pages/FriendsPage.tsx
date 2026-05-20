import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { Button, SectionTitle, Input, Spinner } from '../components/UI'
import { friendService, type FriendRequest } from '../services/friendService'
import { partyService, type PartyInvitation } from '../services/partyService'
import type { User } from '../services/userService'

const FriendsPage = () => {
  const navigate = useNavigate()
  const [friends, setFriends] = useState<User[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [partyInvitations, setPartyInvitations] = useState<PartyInvitation[]>([])
  const [newFriendUsername, setNewFriendUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const [friendList, pending, partyInvites] = await Promise.all([
        friendService.getFriends(),
        friendService.getFriendRequests(),
        partyService.getInvitations(),
      ])
      setFriends(friendList)
      setRequests(pending)
      setPartyInvitations(partyInvites)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error cargando amigos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSendRequest = async () => {
    if (!newFriendUsername.trim()) return
    setIsLoading(true)
    try {
      await friendService.sendFriendRequest(newFriendUsername.trim())
      setNewFriendUsername('')
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo enviar la solicitud')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResponse = async (requestId: string, accept: boolean) => {
    setIsLoading(true)
    try {
      if (accept) await friendService.acceptFriendRequest(requestId)
      else await friendService.rejectFriendRequest(requestId)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo procesar la solicitud')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptPartyInvitation = async (invitationId: string) => {
    setIsLoading(true)
    try {
      const party = await partyService.acceptInvitation(invitationId)
      navigate(`/party/${party.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo aceptar la invitación')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectPartyInvitation = async (invitationId: string) => {
    setIsLoading(true)
    try {
      await partyService.rejectInvitation(invitationId)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo rechazar la invitación')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MobileLayout>
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Volver</Button>
        <SectionTitle>Amigos</SectionTitle>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="card-label">Enviar solicitud</p>
          <div className="row-gap">
            <Input
              value={newFriendUsername}
              onChange={(event) => setNewFriendUsername(event.target.value)}
              placeholder="Username"
            />
            <Button onClick={handleSendRequest} disabled={isLoading}>Enviar</Button>
          </div>
          <p className="text-small">Usá el username para invitar a un amigo directo.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Solicitudes recibidas</h3>
        </div>
        <div className="card-body">
          {isLoading ? (
            <Spinner />
          ) : requests.length ? (
            requests.map((request) => (
              <div key={request.id} className="list-item">
                <div>
                  <strong>{request.requester?.displayName ?? request.requesterId}</strong>
                  <p className="text-small">{request.requester?.username ?? ''}</p>
                </div>
                <div className="button-group">
                  <Button size="sm" variant="primary" onClick={() => handleResponse(request.id, true)}>Aceptar</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleResponse(request.id, false)}>Rechazar</Button>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-sub">No tenés solicitudes pendientes.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Invitaciones directas a parties</h3>
        </div>
        <div className="card-body">
          {isLoading ? (
            <Spinner />
          ) : partyInvitations.length ? (
            partyInvitations.map((inv) => (
              <div key={inv.id} className="list-item">
                <div>
                  <strong>{inv.party?.name ?? 'Party privada'}</strong>
                  <p className="text-small">Invitado por {inv.inviter?.displayName ?? inv.inviterId}</p>
                </div>
                <div className="button-group">
                  <Button size="sm" variant="primary" onClick={() => handleAcceptPartyInvitation(inv.id)}>
                    Aceptar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRejectPartyInvitation(inv.id)}>
                    Rechazar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-sub">No tenés invitaciones directas a parties.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Mis amigos</h3>
        </div>
        <div className="card-body">
          {isLoading ? (
            <Spinner />
          ) : friends.length ? (
            friends.map((friend) => (
              <div key={friend.id} className="list-item">
                <div>
                  <strong>{friend.displayName}</strong>
                  <p className="text-small">{friend.username}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => friendService.removeFriend(friend.id).then(load)}>
                  Eliminar
                </Button>
              </div>
            ))
          ) : (
            <p className="empty-sub">Aún no tenés amigos en StudyQuest.</p>
          )}
        </div>
      </div>
    </MobileLayout>
  )
}

export default FriendsPage
