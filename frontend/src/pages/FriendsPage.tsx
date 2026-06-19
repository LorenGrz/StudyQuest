import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { Button, Input, Spinner } from '../components/UI'
import { PageHeader, PageContainer, Surface, EmptyState } from '../components/PagePrimitives'
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
      <PageContainer>
        <PageHeader
          title="Amigos"
          back={() => navigate('/dashboard')}
        />

        {/* Add-friend form — full-width top surface */}
        <Surface className="mb-4">
          <p className="text-[13px] font-medium text-secondary mb-3">Enviar solicitud de amistad</p>
          <div className="flex gap-2">
            <Input
              value={newFriendUsername}
              onChange={(event) => setNewFriendUsername(event.target.value)}
              placeholder="@username"
              className="flex-1"
            />
            <Button onClick={handleSendRequest} disabled={isLoading}>Enviar</Button>
          </div>
          <p className="text-[12px] text-muted mt-2">Ingresá el @username para invitar a un amigo.</p>
        </Surface>

        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg text-sm bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.2)] mb-4"
          >
            {error}
          </div>
        )}

        {/* Two-column grid at md */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Left column: requests + party invitations */}
          <div className="flex flex-col gap-4">
            {/* Friend requests */}
            <Surface>
              <h3 className="text-[15px] font-bold text-primary mb-3">Solicitudes recibidas</h3>
              {isLoading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : requests.length ? (
                <ul className="flex flex-col divide-y divide-white/5">
                  {requests.map((request) => (
                    <li key={request.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <strong className="text-[14px] font-semibold text-primary block truncate">
                          {request.requester?.displayName ?? request.requesterId}
                        </strong>
                        {request.requester?.username && (
                          <p className="text-[12px] text-secondary truncate">
                            @{request.requester.username}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="primary" onClick={() => handleResponse(request.id, true)}>Aceptar</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleResponse(request.id, false)}>Rechazar</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="📨"
                  title="Sin solicitudes pendientes"
                  description="Cuando alguien te agregue, aparecerá acá."
                />
              )}
            </Surface>

            {/* Party invitations */}
            <Surface>
              <h3 className="text-[15px] font-bold text-primary mb-3">Invitaciones a parties</h3>
              {isLoading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : partyInvitations.length ? (
                <ul className="flex flex-col divide-y divide-white/5">
                  {partyInvitations.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <strong className="text-[14px] font-semibold text-primary block truncate">
                          {inv.party?.name ?? 'Party privada'}
                        </strong>
                        <p className="text-[12px] text-secondary truncate">
                          Invitado por {inv.inviter?.displayName ?? inv.inviterId}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="primary" onClick={() => handleAcceptPartyInvitation(inv.id)}>
                          Aceptar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRejectPartyInvitation(inv.id)}>
                          Rechazar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="🎉"
                  title="Sin invitaciones a parties"
                  description="Las invitaciones directas aparecerán acá."
                />
              )}
            </Surface>
          </div>

          {/* Right column: friend list */}
          <Surface>
            <h3 className="text-[15px] font-bold text-primary mb-3">Mis amigos</h3>
            {isLoading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : friends.length ? (
              <ul className="flex flex-col divide-y divide-white/5">
                {friends.map((friend) => (
                  <li key={friend.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <strong className="text-[14px] font-semibold text-primary block truncate">
                        {friend.displayName}
                      </strong>
                      <p className="text-[12px] text-secondary truncate">
                        @{friend.username}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => friendService.removeFriend(friend.id).then(load)}
                    >
                      Eliminar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="👥"
                title="Aún no tenés amigos"
                description="Buscá a tus compañeros por @username y empezá a conectar."
              />
            )}
          </Surface>
        </div>
      </PageContainer>
    </MobileLayout>
  )
}

export default FriendsPage
