import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SectionTitle, Spinner } from './UI'
import { useDashboardStats } from '../hooks/useDashboardStats'

function formatDay(day: string) {
  return day.slice(5)
}

export function DashboardAnalytics() {
  const { stats, isLoading, error } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="dashboard-analytics-loading">
        <Spinner />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="empty-state">
        <p className="empty-text">{error ?? 'No se pudieron cargar las estadísticas.'}</p>
      </div>
    )
  }

  const hasStudyData = stats.weeklyStudy.some((point) => point.minutes > 0)
  const hasSubjectData = stats.subjectPerformance.length > 0

  return (
    <section className="dashboard-analytics">
      <div className="analytics-header">
        <SectionTitle>Progreso de estudio</SectionTitle>
        <p className="analytics-summary">Tiempo total invertido: <strong>{stats.totalStudyMinutes}</strong> min</p>
      </div>

      {!hasStudyData && !hasSubjectData ? (
        <div className="empty-state">
          <p className="empty-icon">📊</p>
          <p className="empty-text">Todavía no hay métricas. Comenzá un quiz para ver tu progreso.</p>
        </div>
      ) : (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Estudio semanal</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.weeklyStudy} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tickFormatter={formatDay} />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value} min`} />
                <Area type="monotone" dataKey="minutes" stroke="#7c3aed" fill="#c4b5fd" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="analytics-card">
            <h3>Precisión por materia</h3>
            {hasSubjectData ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.subjectPerformance.slice(0, 5)} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subjectName" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} domain={[0, 1]} />
                  <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                  <Legend />
                  <Bar dataKey="accuracy" fill="#2563eb" name="Precisión" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-sub">Aún no tenés resultados de quizzes para materias.</p>
            )}
          </div>
        </div>
      )}

      <div className="analytics-footnote">
        <p>Los datos se calculan a partir de tus resultados de quests y ofrecen una visión histórica por materia.</p>
      </div>
    </section>
  )
}
