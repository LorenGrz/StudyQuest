import { useEffect } from 'react'
import { MobileLayout } from '../components/Layouts'
import {
  GreetingHeader,
  ActivePartyBanner,
  SubjectCardGrid,
  QuickActions,
} from '../components/DashboardComponents'
import { SectionTitle, Spinner } from '../components/UI'
import { useAuthStore } from '../store/authStore'
import { usePartyStore } from '../store/partyStore'
import { useUserSubjects } from '../hooks/useUserSubjects'
import { partyService } from '../services/partyService'

const DashboardPage = () => {
  const { user } = useAuthStore()
  const { subjects, isLoading } = useUserSubjects()
  const { activeParty, setActiveParty } = usePartyStore()

  // Cargar la party activa del usuario
  useEffect(() => {
    partyService.getMine().then((parties) => {
      const active = parties.find((p) => p.status === 'active') ?? null
      setActiveParty(active)
    }).catch(() => {})
  }, [setActiveParty])

  return (
    <MobileLayout>
      <GreetingHeader user={user} />
      <ActivePartyBanner party={activeParty} />
      <SectionTitle>Mis Materias</SectionTitle>
      {isLoading ? (
        <div className="center-spinner">
          <Spinner />
        </div>
      ) : (
        <SubjectCardGrid subjects={subjects} />
      )}
      <QuickActions />
    </MobileLayout>
  )
}

export default DashboardPage
