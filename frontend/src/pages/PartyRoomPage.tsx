import { useState } from 'react'
import { useParams } from 'react-router-dom'
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

type ActiveTab = 'quests' | 'chat' | 'members'

const PartyRoomPage = () => {
  const { partyId } = useParams<{ partyId: string }>()
  const [activeTab, setActiveTab] = useState<ActiveTab>('quests')
  const { party, messages, sendMessage, isLoading } = useParty(partyId ?? '')
  const { quests, uploadNote, isGenerating } = useQuests(partyId ?? '')

  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'quests', label: '⚡ Quests' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'members', label: '👥 Miembros' },
  ]

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
        <ChatBox messages={messages} onSend={sendMessage} />
      )}

      {activeTab === 'members' && (
        <MemberList members={party?.members ?? []} />
      )}
    </MobileLayout>
  )
}

export default PartyRoomPage
