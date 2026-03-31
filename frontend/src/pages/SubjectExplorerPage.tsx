import { useState } from 'react'
import { MobileLayout } from '../components/Layouts'
import { SearchBar, FilterChips, SubjectList } from '../components/SubjectComponents'
import { Badge, Button } from '../components/UI'
import { useSubjectExplorer, type SubjectFilters } from '../hooks/useSubjectExplorer'
import type { Subject } from '../services/userService'

const SubjectExplorerPage = () => {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<SubjectFilters>({
    career: '',
    semester: null,
  })
  const { subjects, isEnrolled, enroll, unenroll, isLoading } = useSubjectExplorer(
    filters,
    search,
  )

  const renderAction = (s: Subject) =>
    isEnrolled(s.id) ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
      <h1 className="page-title">Explorar Materias</h1>
      <SearchBar value={search} onChange={setSearch} />
      <FilterChips filters={filters} onChange={setFilters} />
      <SubjectList subjects={subjects} renderAction={renderAction} />
    </MobileLayout>
  )
}

export default SubjectExplorerPage
