import { useState } from 'react'
import { MobileLayout } from '../components/Layouts'
import { SearchBar, FilterChips, SubjectList } from '../components/subject/SubjectComponents'
import { Badge, Button, Select } from '../components/UI'
import { PageHeader, PageContainer } from '../components/PagePrimitives'
import { useSubjectExplorer, type SubjectFilters } from '../hooks/useSubjectExplorer'
import { useCareers } from '../hooks/useUniversities'
import { useAuthStore } from '../store/authStore'
import type { Subject } from '../services/userService'

const SubjectExplorerPage = () => {
  const { user } = useAuthStore()
  const { careers } = useCareers()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<SubjectFilters>({
    career: user?.career ?? '',
    year: null,
  })
  const { subjects, isEnrolled, enroll, unenroll } = useSubjectExplorer(
    filters,
    search,
  )

  const renderAction = (s: Subject) =>
    isEnrolled(s.id) ? (
      <div className="flex flex-col items-end gap-1">
        <Badge variant="success">Inscripto</Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); unenroll(s.id) }}
        >
          Salir
        </Button>
      </div>
    ) : (
      <Button size="sm" onClick={(e) => { e.stopPropagation(); enroll(s.id) }}>
        + Unirme
      </Button>
    )

  return (
    <MobileLayout>
      <PageContainer>
        <PageHeader title="Explorar Materias" />
        <div className="flex flex-col gap-4">
          <SearchBar value={search} onChange={setSearch} />
          <Select
            id="explorer-career"
            label="Carrera"
            value={filters.career}
            onChange={(e) => setFilters({ ...filters, career: e.target.value })}
            options={careers.map((c) => ({ value: c, label: c }))}
          />
          <FilterChips filters={filters} onChange={setFilters} />
          <SubjectList subjects={subjects} renderAction={renderAction} />
        </div>
      </PageContainer>
    </MobileLayout>
  )
}

export default SubjectExplorerPage
