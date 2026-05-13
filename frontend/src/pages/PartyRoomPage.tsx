import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import {
  PartyHeader,
  TabBar,
  ChatBox,
  MemberList,
  UploadNoteCard,
  QuestCard,
} from '../components/PartyComponents'
import { Spinner } from '../components/UI'
import { useParty } from '../hooks/useParty'
import { useQuests } from '../hooks/useQuests'
import { usePomodoro } from '../hooks/usePomodoro'
import { PomodoroTimer, SharedTodoList } from '../components/PomodoroComponents'
import { partyService } from '../services/partyService'

type ActiveTab = 'quests' | 'chat' | 'members' | 'pomodoro'

const PartyRoomPage = () => {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ActiveTab>('quests')
  const { party, setParty, messages, sendMessage, isLoading, currentUserId } = useParty(partyId ?? '')
  const { quests, uploadNote, isGenerating } = useQuests(partyId ?? '')
  const { state: pomodoroState, start, pause, reset, updateConfig } = usePomodoro(partyId ?? '')

  // Set default tab based on party type
  useEffect(() => {
    if (party?.type === 'study' && activeTab === 'quests') {
      setActiveTab('pomodoro')
    }
  }, [party?.type])

  const tabs: Array<{ id: ActiveTab; label: string }> = party?.type === 'study' 
    ? [
        { id: 'pomodoro', label: '⏱️ Focus' },
        { id: 'chat', label: '💬 Chat' },
        { id: 'members', label: '👥 Miembros' },
      ]
    : [
        { id: 'quests', label: '⚡ Quests' },
        { id: 'chat', label: '💬 Chat' },
        { id: 'members', label: '👥 Miembros' },
      ]

  const isLeader = party?.members.find(m => m.userId === currentUserId)?.role === 'leader'

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

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="center-spinner"><Spinner size="lg" /></div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <PartyHeader party={party} />
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'pomodoro' && (
        <div className="tab-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PomodoroTimer
              state={pomodoroState}
              onStart={start}
              onPause={pause}
              onReset={reset}
              onConfigChange={updateConfig}
              isLeader={!!isLeader}
            />
            <SharedTodoList partyId={partyId ?? ''} currentUserId={currentUserId ?? ''} />
          </div>
        </div>
      )}

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
        <ChatBox messages={messages} onSend={sendMessage} currentUserId={currentUserId} />
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
    </MobileLayout>
  )
}

export default PartyRoomPage