import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { applyStoredTheme } from './hooks/useTheme'

applyStoredTheme()

// Wake up the Render free-tier API as early as possible to minimize cold-start delay.
fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/health`).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Toaster position="top-center" />
  </StrictMode>,
)
