import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import {
  PartyHeader,
  TabBar,
  MemberList,
  UploadNoteCard,
  QuestCard,
  ActivityFeed,
} from '../components/PartyComponents'
import { ChatBox } from '../components/party-chat/ChatBox'
import { Spinner } from '../components/UI'
import { useParty } from '../hooks/useParty'
import { useQuests } from '../hooks/useQuests'
import { useActivity } from '../hooks/useActivity'
import { partyService } from '../services/partyService'

type ActiveTab = 'quests' | 'chat' | 'members' | 'activity'

const PartyRoomPage = () => {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ActiveTab>('quests')
  const {
    party,
    setParty,
    messages,
    sendTextMessage,
    sendFileMessage,
    sendAudioMessage,
    isPartyLoading,
    isChatLoading,
    chatError,
    currentUserId,
  } = useParty(partyId ?? '')
  const { quests, uploadNote, isGenerating } = useQuests(partyId ?? '')
  const { activities, isLoading: activityLoading } = useActivity(partyId ?? '')

  const tabs: Array<{ id: ActiveTab; label: string; ariaLabel: string }> = [
    { id: 'quests', label: 'Quests', ariaLabel: 'Ver quests de la party' },
    { id: 'chat', label: 'Chat', ariaLabel: 'Abrir chat de la party' },
    { id: 'members', label: 'Miembros', ariaLabel: 'Ver miembros de la party' },
    { id: 'activity', label: 'Actividad', ariaLabel: 'Ver actividad reciente de la party' },
  ]

  const handleLeave = async () => {
    if (!party) return
    try {
      await partyService.leaveParty(party.id)
      navigate('/parties')
    } catch (err) {
      console.error('Error al salir de la party:', err)
    }
  }

  const handleRemoveMember = async (targetUserId: string) => {
    if (!party) return
    try {
      await partyService.removeMember(party.id, targetUserId)
      setParty({
        ...party,
        members: party.members.filter((m) => m.userId !== targetUserId),
      })
    } catch (err) {
      console.error('Error al remover miembro:', err)
    }
  }

  const handleCloseParty = async () => {
    if (!party) return
    try {
      await partyService.closeParty(party.id)
      navigate('/parties')
    } catch (err) {
      console.error('Error al cerrar la party:', err)
    }
  }

  if (isPartyLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spinner size="lg" />
        <p>Cargando la party...</p>
      </div>
    )
  }

  return (
    <MobileLayout>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="sticky top-0 z-20 bg-gradient-to-b from-[rgba(11,11,24,0.98)] to-[rgba(11,11,24,0.94)] backdrop-blur-[14px]">
          <PartyHeader party={party} />
          <TabBar
            tabs={tabs}
            active={activeTab}
            onChange={(tab) => setActiveTab(tab)}
          />
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === 'quests' && (
            <div className="flex flex-col gap-3 p-4 overflow-y-auto min-h-0">
              <UploadNoteCard onUpload={uploadNote} isLoading={isGenerating} />
              {quests.map((q) => <QuestCard key={q.id} quest={q} />)}
              {quests.length === 0 && !isGenerating && (
                <div className="text-center py-10 px-5">
                  <p className="text-5xl block mb-3">⚡</p>
                  <p className="text-lg font-semibold text-primary">No hay quests todavía</p>
                  <p className="text-sm text-muted mt-1.5">Subí un apunte para generar el primero</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatBox
              messages={messages}
              isLoading={isChatLoading}
              error={chatError}
              onSendText={sendTextMessage}
              onSendFile={sendFileMessage}
              onSendAudio={sendAudioMessage}
              currentUserId={currentUserId}
            />
          )}

          {activeTab === 'members' && (
            <MemberList 
              members={party?.members ?? []} 
              partyId={partyId ?? ''} 
              isPrivate={party?.isPrivate ?? false}
              currentUserId={currentUserId}
              onVisibilityChange={(isPrivate) => {
                if (!party) return
                partyService.updateVisibility(party.id, isPrivate).then(() => {
                  setParty({ ...party, isPrivate })
                }).catch(console.error)
              }}
              onLeave={handleLeave}
              onRemoveMember={handleRemoveMember}
              onCloseParty={handleCloseParty}
            />
          )}

          {activeTab === 'activity' && (
            <div className="flex flex-col gap-3 p-4 overflow-y-auto min-h-0">
              <ActivityFeed activities={activities} isLoading={activityLoading} />
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  )
}

export default PartyRoomPage
