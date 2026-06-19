import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import {
  GreetingHeader,
  ActivePartyBanner,
  SubjectCardGrid,
  QuickActions,
} from '../components/DashboardComponents'
import { SectionTitle, Spinner, Button } from '../components/UI'
import { Alert, PageContainer } from '../components/PagePrimitives'
import { useAuthStore } from '../store/authStore'
import { usePartyStore } from '../store/partyStore'
import { useUserSubjects } from '../hooks/useUserSubjects'
import { partyService } from '../services/partyService'
import { userService, type RecommendedQuestDto, type LeaderboardEntry, type Subject } from '../services/userService'
import { tournamentService } from '../services/tournamentService'
import { searchService, type GlobalSearchResponseDto } from '../services/searchService'
import { getLeague, DEFAULT_ELO } from '../utils/leagues'

// Componente helper para las tarjetas de quest recomendadas/del día
const RecommendedQuestCard = ({ quest }: { quest: RecommendedQuestDto }) => {
  const navigate = useNavigate()
  return (
    <div 
      className="flex items-center gap-3 bg-surface border border-white/8 rounded-[18px] px-4 py-3.5 cursor-pointer transition-all duration-200 hover:border-accent hover:-translate-y-0.5" 
      onClick={() => navigate(`/quiz/${quest.id}`)}
      style={{ marginBottom: '8px' }}
    >
      <div className="flex-1">
        <p className="font-semibold text-[15px]">{quest.title}</p>
        <p className="text-xs text-muted mt-0.5">
          {quest.subjectName} • {quest.playCount} {quest.playCount === 1 ? 'jugada' : 'jugadas'}
        </p>
      </div>
      <span className="text-xl shrink-0">▶</span>
    </div>
  )
}

const HomeLeaderboardPreview = ({ subjects }: { subjects: Subject[] }) => {
  const [selectedTab, setSelectedTab] = useState<'global' | string>('global')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const fetchLeaderboard = async () => {
      try {
        if (selectedTab === 'global') {
          const data = await userService.getGlobalLeaderboard(5)
          setEntries(data)
        } else {
          const data = await userService.getLeaderboard(selectedTab, 5)
          setEntries(data)
        }
      } catch (err) {
        setError('No se pudo cargar el ranking')
      } finally {
        setIsLoading(false)
      }
    }
    fetchLeaderboard()
  }, [selectedTab])

  return (
    <div className="bg-surface border border-white/8 rounded-2xl p-4 flex flex-col gap-4 mt-2">
      <div className="flex justify-between items-center">
        <h3 className="text-muted text-xs font-bold uppercase tracking-wider">🏆 Ranking / Leaderboard</h3>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedTab('global')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${selectedTab === 'global' ? 'bg-accent text-white' : 'bg-elevated text-muted border border-white/5 hover:border-white/15'}`}
        >
          🌎 Global
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedTab(sub.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${selectedTab === sub.id ? 'bg-accent text-white' : 'bg-elevated text-muted border border-white/5 hover:border-white/15'}`}
          >
            📚 {sub.code}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-white/10 border-t-[#7c3aed] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-xs text-center py-2 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>
      ) : entries.length === 0 ? (
        <div className="text-muted text-xs text-center py-4">No hay datos en este ranking.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, idx) => {
            const league = getLeague(entry.elo ?? DEFAULT_ELO)
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
            return (
              <div
                key={entry.userId}
                className="flex items-center gap-3 bg-elevated/60 hover:bg-elevated border border-white/5 p-2 rounded-xl transition-all duration-200"
              >
                <div className="w-6 text-center font-bold text-sm text-muted">
                  {medal ? <span className="text-base">{medal}</span> : <span>#{idx + 1}</span>}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                  ) : (
                    entry.displayName?.charAt(0).toUpperCase() ?? '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{entry.displayName}</p>
                  <p className="text-muted text-[10px] truncate">@{entry.username}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-[10px] mr-1" title={league.name}>{league.icon}</span>
                  <span className="text-xs font-bold" style={{ color: league.color }}>{entry.elo} ELO</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { subjects, isLoading: isSubjectsLoading } = useUserSubjects()
  const { activeParty, setActiveParty } = usePartyStore()

  // Tournaments state
  const [tournaments, setTournaments] = useState<any[]>([])
  const [isTournamentsLoading, setIsTournamentsLoading] = useState(false)

  // 1. Quests para hoy state
  const [questsToday, setQuestsToday] = useState<RecommendedQuestDto[]>([])
  const [isQuestsTodayLoading, setIsQuestsTodayLoading] = useState(false)
  const [questsTodayError, setQuestsTodayError] = useState<string | null>(null)

  // 2. Recommended quests state
  const [recommendedQuests, setRecommendedQuests] = useState<RecommendedQuestDto[]>([])
  const [recommendedPage, setRecommendedPage] = useState(1)
  const [recommendedTotalPages, setRecommendedTotalPages] = useState(1)
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(false)
  const [recommendedError, setRecommendedError] = useState<string | null>(null)

  // 3. Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GlobalSearchResponseDto | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

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

  // Cargar Quests para hoy
  const loadQuestsToday = useCallback(() => {
    setIsQuestsTodayLoading(true)
    userService
      .getQuestsToday()
      .then((data) => {
        setQuestsToday(data)
        setQuestsTodayError(null)
      })
      .catch(() => {
        setQuestsTodayError('error')
      })
      .finally(() => {
        setIsQuestsTodayLoading(false)
      })
  }, [])

  useEffect(() => {
    loadQuestsToday()
  }, [loadQuestsToday])

  // Cargar Recommended quests (paginado)
  useEffect(() => {
    setIsRecommendedLoading(true)
    userService
      .getRecommendedQuests(recommendedPage, 5)
      .then((data) => {
        setRecommendedQuests(data.items)
        setRecommendedTotalPages(data.totalPages)
        setRecommendedError(null)
      })
      .catch((err) => {
        setRecommendedError(err?.response?.data?.message ?? 'Error al cargar recomendaciones')
      })
      .finally(() => {
        setIsRecommendedLoading(false)
      })
  }, [recommendedPage])

  // Search Debounce (300ms)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null)
      setSearchError(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const handler = setTimeout(() => {
      searchService
        .searchGlobal(searchQuery.trim())
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
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery])

  return (
    <MobileLayout>
      <PageContainer>
        <div className="flex flex-col gap-3 pb-11">
          {/* Full-width: greeting, search, active party */}
          <GreetingHeader user={user} />

          {/* Search Bar & Inline Results */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuarios, materias y quests..."
                style={{ flex: 1, margin: 0 }}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  style={{ padding: '8px 12px' }}
                >
                  Limpiar
                </Button>
              )}
            </div>

            {(isSearching || searchResults || searchError) && (
              <div
                className="search-results-panel"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginTop: '8px',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  zIndex: 10,
                }}
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
                                  onClick={() => {
                                    setSearchQuery('')
                                    navigate(`/quiz/${q.id}`)
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
                                  style={{
                                    background: 'var(--bg-elevated)',
                                    padding: '10px',
                                    borderRadius: 'var(--radius-sm)',
                                  }}
                                >
                                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{s.name}</strong>
                                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{s.code} • Semestre {s.semester}</p>
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

          <ActivePartyBanner party={activeParty} />

          {/* Responsive two-column grid (desktop) / single-column (mobile) */}
          <div className="flex flex-col gap-4">
            {/* ── Main column ── */}
            <div className="flex flex-col gap-3">
              {/* Quests para hoy */}
              <SectionTitle>Quests para hoy</SectionTitle>
              {isQuestsTodayLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><Spinner /></div>
              ) : questsTodayError ? (
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {questsToday.map((q) => (
                    <RecommendedQuestCard key={q.id} quest={q} />
                  ))}
                </div>
              )}

              {/* Recomendados (Paginado) */}
              <SectionTitle>Recomendados</SectionTitle>
              {isRecommendedLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><Spinner /></div>
              ) : recommendedError ? (
                <Alert
                  title="No pudimos cargar las recomendaciones"
                  description="La API no respondió. Intentá de nuevo en unos momentos."
                  actionLabel="Reintentar"
                  onAction={() => setRecommendedPage(1)}
                />
              ) : recommendedQuests.length === 0 ? (
                <div className="text-center py-10 px-5">
                  <p className="text-5xl block mb-3">📖</p>
                  <p className="text-lg font-semibold text-primary">Sin recomendaciones</p>
                  <p className="text-sm text-muted mt-1.5">Inscribite a más materias para ver quests recomendadas.</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {recommendedQuests.map((q) => (
                      <RecommendedQuestCard key={q.id} quest={q} />
                    ))}
                  </div>

                  {/* Paginación */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '8px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={recommendedPage <= 1 || isRecommendedLoading}
                      onClick={() => setRecommendedPage(p => p - 1)}
                    >
                      ← Anterior
                    </Button>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
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
            </div>

            {/* ── Secondary column ── */}
            <div className="flex flex-col gap-3 mt-3 lg:mt-0">
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
                <div className="text-center py-4 px-4 bg-surface rounded-2xl border border-white/[0.05]">
                  <p className="text-sm text-muted" style={{ margin: 0 }}>No hay torneos activos en este momento.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tournaments.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(t.status === 'finished' ? `/tournament/${t.id}/results` : `/tournament/${t.id}`)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-surface to-elevated border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer"
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
                          <span className="text-white font-extrabold text-xs truncate max-w-[180px]">{t.title}</span>
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

              <HomeLeaderboardPreview subjects={subjects} />
            </div>
          </div>

          <QuickActions />
        </div>
      </PageContainer>
    </MobileLayout>
  )
}

export default DashboardPage
