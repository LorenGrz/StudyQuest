import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import {
  GreetingHeader,
  ActivePartyBanner,
  SubjectCardGrid,
  QuickActions,
  GetStartedNotice,
} from '../components/dashboard/DashboardComponents'
import { SectionTitle, Spinner, Button, Reveal, Collapsible } from '../components/UI'
import { Alert, PageContainer } from '../components/PagePrimitives'
import { useAuthStore } from '../store/authStore'
import { usePartyStore } from '../store/partyStore'
import { useUserSubjects } from '../hooks/useUserSubjects'
import { useQuestsToday } from '../hooks/useQuestsToday'
import { useRecommendedQuests } from '../hooks/useRecommendedQuests'
import { partyService } from '../services/partyService'
import { tournamentService } from '../services/tournamentService'
import { searchService, type GlobalSearchResponseDto } from '../services/searchService'

import { RecommendedQuestCard } from '../components/dashboard/RecommendedQuestCard'
import { HomeLeaderboardPreview } from '../components/dashboard/HomeLeaderboardPreview'

const SEARCH_LISTBOX_ID = 'dashboard-search-results'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { subjects, isLoading: isSubjectsLoading } = useUserSubjects()
  const { activeParty, setActiveParty } = usePartyStore()

  // Tournaments state
  const [tournaments, setTournaments] = useState<any[]>([])
  const [isTournamentsLoading, setIsTournamentsLoading] = useState(false)

  // 1. Quests para hoy
  const {
    data: questsToday,
    loading: isQuestsTodayLoading,
    error: questsTodayError,
    recargar: loadQuestsToday,
  } = useQuestsToday()

  // 2. Recommended quests (paginado)
  const {
    items: recommendedQuests,
    page: recommendedPage,
    setPage: setRecommendedPage,
    totalPages: recommendedTotalPages,
    total: recommendedTotal,
    loading: isRecommendedLoading,
    error: recommendedError,
    recargar: reloadRecommended,
  } = useRecommendedQuests()

  // 3. Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GlobalSearchResponseDto | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchDismissed, setIsSearchDismissed] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isSearchOpen = !isSearchDismissed && (isSearching || !!searchResults || !!searchError)

  // Cargar la party activa del usuario
  useEffect(() => {
    partyService.getMine().then((parties) => {
      const active = parties.find((p) => p.status === 'active') ?? null
      setActiveParty(active)
    }).catch(() => {})
  }, [setActiveParty])

  // Cargar torneos
  useEffect(() => {
    setIsTournamentsLoading(true)
    tournamentService
      .getAll()
      .then((data) => {
        const activeOrPending = data.filter((t) => t.status === 'active' || t.status === 'pending')
        setTournaments(activeOrPending.slice(0, 2))
      })
      .catch(() => {})
      .finally(() => {
        setIsTournamentsLoading(false)
      })
  }, [])

  // Search Debounce (300ms). Every setState call lives inside this timeout's
  // callback (an async boundary), never as a direct synchronous statement in
  // the effect body, so clearing the query below doesn't fire on every commit.
  useEffect(() => {
    const query = searchQuery.trim()
    const delay = query.length < 2 ? 0 : 300

    const handler = setTimeout(() => {
      if (query.length < 2) {
        setSearchResults(null)
        setSearchError(null)
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      searchService
        .searchGlobal(query)
        .then((data) => {
          setSearchResults(data)
          setSearchError(null)
        })
        .catch((err) => {
          setSearchError(err?.response?.data?.message ?? 'Error en la búsqueda')
          setSearchResults(null)
        })
        .finally(() => {
          setIsSearching(false)
        })
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery])

  // Cierra el dropdown de búsqueda con Escape (devolviendo el foco al input)
  // o al hacer click fuera del wrapper. Mismo patrón que StudyBotWidget.
  useEffect(() => {
    if (!isSearchOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchDismissed(true)
        searchInputRef.current?.focus()
      }
    }
    const onPointerDown = (e: PointerEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsSearchDismissed(true)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isSearchOpen])

  const closeSearchResults = () => {
    setSearchQuery('')
    setSearchResults(null)
    setIsSearchDismissed(true)
  }

  const isInitialRecommendedLoad = isRecommendedLoading && recommendedQuests.length === 0 && !recommendedError

  return (
    <MobileLayout>
      <PageContainer>
        <div className="flex flex-col gap-3 pb-11">
          {/* Full-width: greeting, quick actions, search, active party */}
          <Reveal delay={0}>
            <GreetingHeader user={user} />
          </Reveal>

          {/* Accesos rápidos arriba de todo */}
          <QuickActions />

          {/* Onboarding: si no está inscripto en ninguna materia */}
          {!isSubjectsLoading && subjects.length === 0 && (
            <Reveal delay={0.05}>
              <GetStartedNotice />
            </Reveal>
          )}

          {/* Search bar & floating results dropdown (does not push content) */}
          <Reveal delay={0.1} className="mb-2">
            <div className="relative" ref={searchWrapperRef}>
            <div className="flex gap-2 items-center">
              <input
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-label="Buscar usuarios, materias y quests"
                aria-expanded={isSearchOpen}
                aria-controls={SEARCH_LISTBOX_ID}
                aria-autocomplete="list"
                className="flex-1 w-full min-h-[2.75rem] px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[var(--accent)] transition-all duration-200"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchDismissed(false)
                }}
                placeholder="Buscar usuarios, materias y quests..."
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeSearchResults}
                  style={{ padding: '8px 12px' }}
                >
                  Limpiar
                </Button>
              )}
            </div>

            {isSearchOpen && (
              <div
                id={SEARCH_LISTBOX_ID}
                role="listbox"
                aria-label="Resultados de búsqueda"
                className="absolute left-0 right-0 top-full mt-2 z-30 max-h-[60vh] overflow-y-auto bg-surface border border-edge rounded-lg p-4 flex flex-col gap-3"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                {isSearching && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
                    <Spinner size="sm" />
                  </div>
                )}

                {searchError && (
                  <p style={{ color: 'var(--red)', fontSize: '14px', margin: 0 }}>{searchError}</p>
                )}

                {searchResults && (
                  <>
                    {searchResults.totalResults === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: 0 }}>
                        No se encontraron resultados.
                      </p>
                    ) : (
                      <>
                        {/* Quests */}
                        {searchResults.quests.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Quests</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {searchResults.quests.map((q) => (
                                <div
                                  key={q.id}
                                  role="option"
                                  aria-selected={false}
                                  tabIndex={0}
                                  onClick={() => {
                                    closeSearchResults()
                                    navigate(`/quiz/${q.id}`)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      closeSearchResults()
                                      navigate(`/quiz/${q.id}`)
                                    }
                                  }}
                                  style={{
                                    background: 'var(--bg-elevated)',
                                    padding: '10px',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <div>
                                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{q.title}</strong>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{q.subjectName}</p>
                                  </div>
                                  <span style={{ fontSize: '14px', color: 'var(--accent-light)' }}>▶</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Materias */}
                        {searchResults.subjects.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Materias</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {searchResults.subjects.map((s) => (
                                <div
                                  key={s.id}
                                  role="option"
                                  aria-selected={false}
                                  style={{
                                    background: 'var(--bg-elevated)',
                                    padding: '10px',
                                    borderRadius: 'var(--radius-sm)',
                                  }}
                                >
                                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{s.name}</strong>
                                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{s.code} • Año {s.year}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Usuarios */}
                        {searchResults.users.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Usuarios</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {searchResults.users.map((u) => (
                                <div
                                  key={u.id}
                                  role="option"
                                  aria-selected={false}
                                  style={{
                                    background: 'var(--bg-elevated)',
                                    padding: '10px',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                  }}
                                >
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--accent), #2563eb)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    overflow: 'hidden',
                                  }}>
                                    {u.avatarUrl ? (
                                      <img src={u.avatarUrl} alt={u.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      u.displayName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{u.displayName}</strong>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>@{u.username}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            </div>
          </Reveal>

          {activeParty && (
            <Reveal delay={0.12}>
              <ActivePartyBanner party={activeParty} />
            </Reveal>
          )}

          {/* Two columns on desktop, single column on mobile */}
          <Reveal delay={0.15} className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
            {/* ── Main column ── */}
            <div className="flex flex-col gap-3 lg:flex-1 lg:min-w-0">
              {/* Quests para hoy (colapsable) */}
              {isQuestsTodayLoading ? (
                <div className="flex items-center justify-between pt-4 pb-1">
                  <span className="text-base font-bold text-secondary uppercase tracking-[1px]">Quests para hoy</span>
                  <Spinner size="sm" />
                </div>
              ) : (
                <Collapsible
                  id="today"
                  title="Quests para hoy"
                  summary={questsTodayError ? undefined : questsToday.length === 0 ? 'Todo al día' : `${questsToday.length} pendientes`}
                  defaultOpen={questsToday.length <= 2}
                  forceOpen={!!questsTodayError}
                >
                  {questsTodayError ? (
                    <Alert
                      title="No pudimos cargar tus quests"
                      description="La API no respondió. Podés seguir usando el resto de StudyQuest."
                      actionLabel="Reintentar"
                      onAction={loadQuestsToday}
                    />
                  ) : questsToday.length === 0 ? (
                    <div className="text-center py-10 px-5">
                      <p className="text-5xl block mb-3">✨</p>
                      <p className="text-lg font-semibold text-primary">¡Todo al día!</p>
                      <p className="text-sm text-muted mt-1.5">No tenés quests pendientes para hoy.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {questsToday.map((q, i) => (
                        <RecommendedQuestCard key={q.id} quest={q} index={i} />
                      ))}
                    </div>
                  )}
                </Collapsible>
              )}

              {/* Recomendados (colapsable, paginado) */}
              {isInitialRecommendedLoad ? (
                <div className="flex items-center justify-between pt-4 pb-1">
                  <span className="text-base font-bold text-secondary uppercase tracking-[1px]">Recomendados</span>
                  <Spinner size="sm" />
                </div>
              ) : (
                <Collapsible
                  id="recommended"
                  title="Recomendados"
                  summary={recommendedError ? undefined : recommendedTotal}
                  defaultOpen={false}
                  forceOpen={!!recommendedError}
                >
                  {recommendedError ? (
                    <Alert
                      title="No pudimos cargar las recomendaciones"
                      description="La API no respondió. Intentá de nuevo en unos momentos."
                      actionLabel="Reintentar"
                      onAction={reloadRecommended}
                    />
                  ) : recommendedQuests.length === 0 ? (
                    <div className="text-center py-10 px-5">
                      <p className="text-5xl block mb-3">📖</p>
                      <p className="text-lg font-semibold text-primary">Sin recomendaciones</p>
                      <p className="text-sm text-muted mt-1.5">Inscribite a más materias para ver quests recomendadas.</p>
                    </div>
                  ) : (
                    <div>
                      {/* Mismos ítems visibles (atenuados) mientras pagina, en vez de
                          colapsar todo a un spinner: la altura de la lista no salta. */}
                      <div className="relative">
                        <div className={`flex flex-col ${isRecommendedLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {recommendedQuests.map((q, i) => (
                            <RecommendedQuestCard key={q.id} quest={q} index={i} />
                          ))}
                        </div>
                        {isRecommendedLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Spinner size="sm" />
                          </div>
                        )}
                      </div>

                      {/* Paginación */}
                      <div className="flex justify-between items-center mt-3 gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={recommendedPage <= 1 || isRecommendedLoading}
                          onClick={() => setRecommendedPage(p => p - 1)}
                        >
                          ← Anterior
                        </Button>
                        <span className="text-[13px] text-secondary">
                          Pág. {recommendedPage} de {recommendedTotalPages || 1}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={recommendedPage >= recommendedTotalPages || isRecommendedLoading}
                          onClick={() => setRecommendedPage(p => p + 1)}
                        >
                          Siguiente →
                        </Button>
                      </div>
                    </div>
                  )}
                </Collapsible>
              )}
            </div>

            {/* ── Secondary column ── */}
            <div className="flex flex-col gap-3 mt-3 lg:mt-0 lg:w-[340px] lg:shrink-0">
              {/* Mis Materias */}
              <SectionTitle>Mis Materias</SectionTitle>
              {isSubjectsLoading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <Spinner />
                </div>
              ) : (
                <SubjectCardGrid subjects={subjects} />
              )}

              {/* Torneos */}
              <div className="flex justify-between items-center mt-2 shrink-0">
                <SectionTitle>🏆 Torneos Activos y Próximos</SectionTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  onClick={() => navigate('/tournaments')}
                >
                  Ver todos →
                </Button>
              </div>

              {isTournamentsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><Spinner /></div>
              ) : tournaments.length === 0 ? (
                <div className="text-center py-4 px-4 bg-surface rounded-2xl border border-[var(--overlay-border)]">
                  <p className="text-sm text-muted" style={{ margin: 0 }}>No hay torneos activos en este momento.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tournaments.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(t.status === 'finished' ? `/tournament/${t.id}/results` : `/tournament/${t.id}`)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-surface to-elevated border border-[var(--overlay-border)] hover:border-purple-500/30 transition-all cursor-pointer"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            background: t.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                            color: t.status === 'active' ? '#ef4444' : '#a78bfa',
                            textTransform: 'uppercase',
                          }}>
                            {t.status === 'active' ? 'En Vivo' : 'Próximo'}
                          </span>
                          <span className="text-primary font-extrabold text-xs truncate max-w-[180px]">{t.title}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Quest: {t.quest?.title ?? 'Quest del Torneo'}
                        </span>
                      </div>
                      <span className="text-accent-light text-xs font-bold shrink-0">Ver →</span>
                    </div>
                  ))}
                </div>
              )}

              <HomeLeaderboardPreview />
            </div>
          </Reveal>
        </div>
      </PageContainer>
    </MobileLayout>
  )
}

export default DashboardPage
