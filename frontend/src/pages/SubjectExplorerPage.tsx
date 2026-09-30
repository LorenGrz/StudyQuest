import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { SearchBar, FilterChips, SubjectList } from '../components/subject/SubjectComponents'
import { Badge, Button, Input, SectionTitle, Select } from '../components/UI'
import { Alert, EmptyState, PageHeader, PageContainer, Surface } from '../components/PagePrimitives'
import { useSubjectExplorer, type SubjectFilters } from '../hooks/useSubjectExplorer'
import { useCareers } from '../hooks/useUniversities'
import { useSubjectSuggest } from '../hooks/useSubjectSuggest'
import { useAuthStore } from '../store/authStore'
import { subjectService, type CommunitySubject } from '../services/subjectService'
import { userService, type Subject } from '../services/userService'
import { apiErrorData } from '../utils/apiErrors'

type SubjectConflict =
  | { kind: 'similar'; message: string; suggestions: CommunitySubject[] }
  | { kind: 'name_suggestion'; message: string; suggestedName: string }

function messageFromError(err: unknown, fallback: string): string {
  const message = apiErrorData(err)?.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

const SubjectExplorerPage = () => {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const { careers } = useCareers()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<SubjectFilters>({
    career: user?.career ?? '',
    year: null,
  })
  const { subjects, isEnrolled, enroll, unenroll } = useSubjectExplorer(
    { ...filters, universityId: user?.universityId ?? undefined },
    search,
  )

  const enrolledSubjects: Subject[] = user?.enrolledSubjects ?? []

  const [addQuery, setAddQuery] = useState('')
  const { results: suggestions, isLoading: isSuggesting, universityRequired } =
    useSubjectSuggest(addQuery)
  const [conflict, setConflict] = useState<SubjectConflict | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  const handleEnrollSuggestion = async (subjectId: string) => {
    setIsSubmitting(true)
    setAddError(null)
    try {
      await enroll(subjectId)
      setAddQuery('')
      setConflict(null)
    } catch (err) {
      setAddError(messageFromError(err, 'No se pudo unir a la materia'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreate = async (name: string, opts: { force?: boolean } = {}) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsSubmitting(true)
    setAddError(null)
    try {
      await subjectService.createCommunity({ name: trimmed, force: opts.force })
      const updated = await userService.getMe()
      setUser(updated)
      setAddQuery('')
      setConflict(null)
    } catch (err) {
      const data = apiErrorData(err)
      const code = typeof data?.code === 'string' ? data.code : undefined
      const message = messageFromError(err, 'No se pudo crear la materia')
      if (code === 'SIMILAR_SUBJECTS' && Array.isArray(data?.suggestions)) {
        setConflict({
          kind: 'similar',
          message,
          suggestions: data.suggestions as CommunitySubject[],
        })
      } else if (code === 'NAME_SUGGESTION' && typeof data?.suggestedName === 'string') {
        setConflict({ kind: 'name_suggestion', message, suggestedName: data.suggestedName })
      } else {
        setConflict(null)
        setAddError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReport = async (subjectId: string) => {
    try {
      await subjectService.reportSubject(subjectId)
      setReportedIds((prev) => new Set(prev).add(subjectId))
    } catch (err) {
      setAddError(messageFromError(err, 'No se pudo reportar la materia'))
    }
  }

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
        <PageHeader title="Mis materias" />

        <Surface className="mb-4">
          <h3 className="text-[15px] font-bold text-primary mb-3">Materias inscriptas</h3>
          {enrolledSubjects.length ? (
            <ul className="flex flex-col divide-y divide-white/5">
              {enrolledSubjects.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 truncate text-[14px] font-medium text-primary">
                    {s.name}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => unenroll(s.id)}>
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="📚"
              title="Todavía no tenés materias"
              description="Buscá o agregá tu primera materia abajo."
            />
          )}
        </Surface>

        <Surface className="mb-4">
          <h3 className="text-[15px] font-bold text-primary mb-3">Agregar materia</h3>
          <Input
            id="add-subject-query"
            label="Agregar materia"
            value={addQuery}
            onChange={(e) => { setAddQuery(e.target.value); setConflict(null); setAddError(null) }}
            placeholder="Buscar o escribir el nombre de tu materia"
          />

          {universityRequired && (
            <div className="mt-3">
              <Alert
                title="Elegí tu universidad"
                description="Para buscar y crear materias primero elegí tu universidad en tu perfil."
                actionLabel="Ir a mi perfil"
                onAction={() => navigate('/profile')}
              />
            </div>
          )}

          {!universityRequired && addQuery.trim() && (
            <ul className="mt-3 flex flex-col divide-y divide-white/5">
              {isSuggesting && (
                <li className="py-2.5 text-[13px] text-muted">Buscando…</li>
              )}
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <button
                    type="button"
                    disabled={s.enrolled || isSubmitting}
                    onClick={() => handleEnrollSuggestion(s.id)}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left disabled:opacity-60"
                  >
                    <span className="truncate text-[14px] font-medium text-primary">{s.name}</span>
                    {s.source === 'official' && <Badge variant="primary">Oficial</Badge>}
                    {s.visibility === 'private' && <Badge variant="neutral">Privada</Badge>}
                    {s.enrolled && <Badge variant="success">Inscripto</Badge>}
                  </button>
                  {s.source !== 'official' && !s.createdByMe && (
                    reportedIds.has(s.id) ? (
                      <span className="text-[12px] text-muted flex-shrink-0">Reportada</span>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleReport(s.id)}>
                        Reportar
                      </Button>
                    )
                  )}
                </li>
              ))}
              <li className="py-2.5 first:pt-0">
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  disabled={isSubmitting}
                  onClick={() => handleCreate(addQuery)}
                >
                  Agregar «{addQuery.trim()}» como materia nueva
                </Button>
              </li>
            </ul>
          )}

          {conflict?.kind === 'similar' && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] p-3">
              <p className="text-[13px] text-warning">{conflict.message}</p>
              <div className="flex flex-col gap-1.5">
                {conflict.suggestions.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant="secondary"
                    className="justify-start"
                    onClick={() => handleEnrollSuggestion(s.id)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={() => handleCreate(addQuery, { force: true })}
              >
                Crear igual
              </Button>
            </div>
          )}

          {conflict?.kind === 'name_suggestion' && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] p-3">
              <p className="text-[13px] text-warning">{conflict.message}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleCreate(conflict.suggestedName)}
                >
                  Usar «{conflict.suggestedName}»
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCreate(addQuery, { force: true })}
                >
                  Mantener el mío
                </Button>
              </div>
            </div>
          )}

          {addError && (
            <div
              role="alert"
              className="mt-3 px-4 py-3 rounded-lg text-sm bg-[rgba(239,68,68,0.1)] text-danger border border-[rgba(239,68,68,0.2)]"
            >
              {addError}
            </div>
          )}
        </Surface>

        <SectionTitle>Explorar catálogo</SectionTitle>
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
