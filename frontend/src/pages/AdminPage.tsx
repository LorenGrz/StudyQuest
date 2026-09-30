import { useState } from 'react'
import { MobileLayout } from '../components/Layouts'
import { Spinner } from '../components/UI'
import { CareerRequestCard } from '../components/admin/CareerRequestCard'
import { CommunitySubjectCard } from '../components/admin/CommunitySubjectCard'
import { useAdminCareerRequests } from '../hooks/useAdminCareerRequests'
import { useAdminCommunitySubjects } from '../hooks/useAdminCommunitySubjects'
import type { AdminCommunitySubjectTab } from '../services/adminService'

type PageTab = 'career-requests' | 'community-subjects'

const PAGE_TAB_LABELS: Record<PageTab, string> = {
  'career-requests': 'Pedidos de carrera',
  'community-subjects': 'Materias de la comunidad',
}

const SUBJECT_TAB_LABELS: Record<AdminCommunitySubjectTab, string> = {
  new: 'Nuevas',
  reported: 'Reportadas',
  private: 'Privadas con varios usuarios',
}

function CareerRequestsTab() {
  const { requests, loading, error, approve, reject, messageFromError } = useAdminCareerRequests('pending')

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  if (error)
    return <p className="text-sm text-danger px-4">{error}</p>
  if (requests.length === 0)
    return <p className="text-sm text-muted px-4">No hay pedidos de carrera pendientes.</p>

  return (
    <div className="flex flex-col gap-3 px-4">
      {requests.map((r) => (
        <CareerRequestCard
          key={r.id}
          request={r}
          onApprove={approve}
          onReject={reject}
          messageFromError={messageFromError}
        />
      ))}
    </div>
  )
}

function CommunitySubjectsTab() {
  const [subjectTab, setSubjectTab] = useState<AdminCommunitySubjectTab>('new')
  const { subjects, loading, error, publish, hide, unhide, rename, merge, messageFromError } =
    useAdminCommunitySubjects(subjectTab)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 px-4">
        {(Object.keys(SUBJECT_TAB_LABELS) as AdminCommunitySubjectTab[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={subjectTab === tab}
            className={`py-[7px] px-4 rounded-full border border-[var(--overlay-border)] bg-surface text-secondary text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer hover:border-accent hover:text-accent-light min-h-[44px] ${subjectTab === tab ? 'bg-accent border-accent text-on-accent shadow-[0_0_12px_rgba(124,58,237,0.4)]' : ''}`}
            onClick={() => setSubjectTab(tab)}
          >
            {SUBJECT_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}
      {!loading && error && <p className="text-sm text-danger px-4">{error}</p>}
      {!loading && !error && subjects.length === 0 && (
        <p className="text-sm text-muted px-4">No hay materias en esta pestaña.</p>
      )}
      {!loading && !error && subjects.length > 0 && (
        <div className="flex flex-col gap-3 px-4">
          {subjects.map((s) => (
            <CommunitySubjectCard
              key={s.id}
              subject={s}
              candidates={subjects}
              onPublish={publish}
              onHide={hide}
              onUnhide={unhide}
              onRename={rename}
              onMerge={merge}
              messageFromError={messageFromError}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [pageTab, setPageTab] = useState<PageTab>('career-requests')

  return (
    <MobileLayout>
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-2xl font-extrabold pt-5 pb-2">Panel admin</h1>
        <p className="text-[13px] text-muted mt-0.5">
          Pedidos de carrera y materias de la comunidad
        </p>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {(Object.keys(PAGE_TAB_LABELS) as PageTab[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={pageTab === tab}
            className={`py-[7px] px-4 rounded-full border border-[var(--overlay-border)] bg-surface text-secondary text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer hover:border-accent hover:text-accent-light min-h-[44px] ${pageTab === tab ? 'bg-accent border-accent text-on-accent shadow-[0_0_12px_rgba(124,58,237,0.4)]' : ''}`}
            onClick={() => setPageTab(tab)}
          >
            {PAGE_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {pageTab === 'career-requests' ? <CareerRequestsTab /> : <CommunitySubjectsTab />}
    </MobileLayout>
  )
}
