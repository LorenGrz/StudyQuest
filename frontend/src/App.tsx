import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/dashboard'
import SubjectExplorerPage from './pages/SubjectExplorerPage'
import PartyRoomPage from './pages/PartyRoomPage'
import QuizPage from './pages/QuizPage'
import MatchPage from './pages/MatchPage'
import PartiesPage from './pages/PartiesPage'
import FriendsPage from './pages/FriendsPage'
import ProfilePage from './pages/ProfilePage'
import JoinPartyPage from './pages/JoinPartyPage'
import SkillTreePage from './pages/SkillTreePage'
import LeaderboardPage from './pages/LeaderboardPage'
import TournamentsPage from './pages/TournamentsPage'
import TournamentLivePage from './pages/TournamentLivePage'
import TournamentResultsPage from './pages/TournamentResultsPage'
import SettingsPage from './pages/SettingsPage'
import BillingPage from './pages/BillingPage'
import PartyDetailPage from './pages/PartyDetailPage'

function App() {
  return (
    <Routes>
      {/* Ruta raíz → dashboard si autenticado, sino auth */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Pública */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Protegidas */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/subjects" element={<ProtectedRoute><SubjectExplorerPage /></ProtectedRoute>} />

      <Route path="/match" element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />
      <Route path="/party/:partyId" element={<ProtectedRoute><PartyRoomPage /></ProtectedRoute>} />
      <Route path="/party/:partyId/details" element={<ProtectedRoute><PartyDetailPage /></ProtectedRoute>} />
      <Route path="/parties" element={<ProtectedRoute><PartiesPage /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/plan" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
      <Route path="/quiz/:questId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
      <Route path="/join/:token" element={<ProtectedRoute><JoinPartyPage /></ProtectedRoute>} />
      <Route path="/subjects/:subjectId/skill-tree" element={<ProtectedRoute><SkillTreePage /></ProtectedRoute>} />
      <Route path="/tournaments" element={<ProtectedRoute><TournamentsPage /></ProtectedRoute>} />
      <Route path="/tournament/:id" element={<ProtectedRoute><TournamentLivePage /></ProtectedRoute>} />
      <Route path="/tournament/:id/results" element={<ProtectedRoute><TournamentResultsPage /></ProtectedRoute>} />

      {/* 404 → auth */}
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  )
}

export default App
