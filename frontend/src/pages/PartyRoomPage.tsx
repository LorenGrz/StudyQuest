import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import {
  PartyHeader,
  MemberList,
  QuestCard,
  ActivityFeed,
} from '../components/party/PartyComponents'
import { UploadNoteCard } from '../components/party/UploadNoteCard'
import { SegmentedTabs } from '../components/PagePrimitives'
import { ChatBox } from '../components/party-chat/ChatBox'
import { Spinner, Button } from '../components/UI'
import { useParty } from '../hooks/useParty'
import { useQuests } from '../hooks/useQuests'
import { useActivity } from '../hooks/useActivity'
import { partyService } from '../services/partyService'

type ActiveTab = 'quests' | 'chat' | 'members' | 'activity'

const TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'quests', label: 'Quests' },
  { id: 'chat', label: 'Chat' },
  { id: 'members', label: 'Miembros' },
  { id: 'activity', label: 'Actividad' },
]

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
  const { quests, uploadNote, isGenerating, deleteQuest } = useQuests(partyId ?? '')
  const { activities, isLoading: activityLoading } = useActivity(partyId ?? '')

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
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Spinner size="lg" />
          <p className="text-sm text-secondary">Cargando la party...</p>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* Sticky header: party info + tabs */}
        <div className="sticky top-0 z-20 bg-[var(--bg-base)]/95 backdrop-blur-[14px] border-b border-edge">
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/parties')}
              aria-label="Volver a parties"
            >
              ← Volver
            </Button>
          </div>
          <PartyHeader party={party} />
          <div className="px-4 pb-3 overflow-x-auto">
            <SegmentedTabs
              tabs={TABS}
              active={activeTab}
              onChange={(tab) => setActiveTab(tab)}
              label="Secciones de la party"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === 'quests' && (
            <div className="flex flex-col gap-3 p-4 overflow-y-auto min-h-0">
              <UploadNoteCard onUpload={uploadNote} isLoading={isGenerating} />
              <div className="flex flex-col gap-3">
                {quests.map((q) => <QuestCard key={q.id} quest={q} onDelete={deleteQuest} />)}
              </div>
              {quests.length === 0 && !isGenerating && (
                <div className="text-center py-10 px-5">
                  <p className="text-5xl block mb-3" aria-hidden="true">⚡</p>
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
