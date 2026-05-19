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

  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'quests', label: '⚡ Quests' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'members', label: '👥 Miembros' },
    { id: 'activity', label: '📊 Historial' },
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
      <MobileLayout>
        <div className="center-spinner"><Spinner size="lg" /></div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="party-room-shell">
        <div className="party-room-topbar">
          <PartyHeader party={party} />
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>

        <div className="party-room-panel">
          {activeTab === 'quests' && (
            <div className="tab-content">
              <UploadNoteCard onUpload={uploadNote} isLoading={isGenerating} />
              {quests.map((q) => <QuestCard key={q.id} quest={q} />)}
              {quests.length === 0 && !isGenerating && (
                <div className="empty-state">
                  <p className="empty-icon">⚡</p>
                  <p className="empty-text">No hay quests todavía</p>
                  <p className="empty-sub">Subí un apunte para generar el primero</p>
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
            <div className="tab-content">
              <ActivityFeed activities={activities} isLoading={activityLoading} />
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  )
}

export default PartyRoomPage
