import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyStoredTheme } from './hooks/useTheme'

applyStoredTheme()

// Wake up the Render free-tier API as early as possible to minimize cold-start delay.
fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/health`).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user" makes framer-motion honour prefers-reduced-motion
        (the CSS media block only covers CSS animations). */}
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <BrowserRouter basename="/StudyQuest">
          <App />
        </BrowserRouter>
        <Toaster position="top-center" />
      </ErrorBoundary>
    </MotionConfig>
  </StrictMode>,
)
