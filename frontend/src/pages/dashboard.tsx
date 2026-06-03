import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import {
  GreetingHeader,
  ActivePartyBanner,
  SubjectCardGrid,
  QuickActions,
} from '../components/DashboardComponents'
import { SectionTitle, Spinner, Button } from '../components/UI'
import { useAuthStore } from '../store/authStore'
import { usePartyStore } from '../store/partyStore'
import { useUserSubjects } from '../hooks/useUserSubjects'
import { partyService } from '../services/partyService'
import { userService, type RecommendedQuestDto } from '../services/userService'
import { searchService, type GlobalSearchResponseDto } from '../services/searchService'

// Componente helper para las tarjetas de quest recomendadas/del día
const RecommendedQuestCard = ({ quest }: { quest: RecommendedQuestDto }) => {
  const navigate = useNavigate()
  return (
    <div 
      className="quest-card" 
      onClick={() => navigate(`/quiz/${quest.id}`)}
      style={{ marginBottom: '8px' }}
    >
      <div className="quest-card-info">
        <p className="quest-card-title">{quest.title}</p>
        <p className="quest-card-meta">
          {quest.subjectName} • {quest.playCount} {quest.playCount === 1 ? 'jugada' : 'jugadas'}
        </p>
      </div>
      <span className="quest-status">▶</span>
    </div>
  )
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { subjects, isLoading: isSubjectsLoading } = useUserSubjects()
  const { activeParty, setActiveParty } = usePartyStore()

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

  // Cargar Quests para hoy
  useEffect(() => {
    setIsQuestsTodayLoading(true)
    userService
      .getQuestsToday()
      .then((data) => {
        setQuestsToday(data)
        setQuestsTodayError(null)
      })
      .catch((err) => {
        setQuestsTodayError(err?.response?.data?.message ?? 'Error al cargar quests de hoy')
      })
      .finally(() => {
        setIsQuestsTodayLoading(false)
      })
  }, [])

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
      <div className="dashboard-page">
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
                zIndex: 10
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
                                  alignItems: 'center'
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
                                  borderRadius: 'var(--radius-sm)'
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
                                  gap: '10px'
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
                                  overflow: 'hidden'
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

        {/* 1. Quests para hoy */}
        <SectionTitle>Quests para hoy</SectionTitle>
        {isQuestsTodayLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><Spinner /></div>
        ) : questsTodayError ? (
          <div className="alert alert-danger">{questsTodayError}</div>
        ) : questsToday.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>
            <p className="empty-icon">✨</p>
            <p className="empty-text">¡Todo al día!</p>
            <p className="empty-sub">No tenés quests pendientes para hoy.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {questsToday.map((q) => (
              <RecommendedQuestCard key={q.id} quest={q} />
            ))}
          </div>
        )}

        {/* 2. Recomendados (Paginado) */}
        <SectionTitle>Recomendados</SectionTitle>
        {isRecommendedLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><Spinner /></div>
        ) : recommendedError ? (
          <div className="alert alert-danger">{recommendedError}</div>
        ) : recommendedQuests.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>
            <p className="empty-icon">📖</p>
            <p className="empty-text">Sin recomendaciones</p>
            <p className="empty-sub">Inscribite a más materias para ver quests recomendadas.</p>
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

        {/* Mis Materias */}
        <SectionTitle>Mis Materias</SectionTitle>
        {isSubjectsLoading ? (
          <div className="center-spinner">
            <Spinner />
          </div>
        ) : (
          <SubjectCardGrid subjects={subjects} />
        )}
        
        <QuickActions />
      </div>
    </MobileLayout>
  )
}

export default DashboardPage
