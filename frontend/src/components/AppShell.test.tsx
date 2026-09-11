import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { billingService } from '../services/billingService'

// AppShell mounts the study-bot widget, which checks the plan on mount —
// stub it so these layout tests don't fire a real network request.
vi.mock('../services/billingService', () => ({
  billingService: { getState: vi.fn() },
}))
vi.mocked(billingService.getState).mockResolvedValue({
  limits: { studyBotEnabled: false },
} as never)

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <div>Content</div>
      </AppShell>
    </MemoryRouter>,
  )

describe('AppShell', () => {
  it('exposes the primary destinations', () => {
    renderAt('/dashboard')
    for (const name of ['Inicio', 'Match', 'Parties', 'Perfil']) {
      expect(screen.getAllByRole('link', { name }).length).toBeGreaterThan(0)
    }
  })

  it('marks the current destination', () => {
    renderAt('/parties')
    expect(
      screen.getAllByRole('link', { name: 'Parties' })[0],
    ).toHaveAttribute('aria-current', 'page')
  })

  it('gives the desktop sidebar the secondary destinations and account actions', () => {
    renderAt('/dashboard')
    const sidebar = screen.getByRole('complementary')
    for (const name of ['Materias', 'Amigos', 'Torneos', 'Ajustes']) {
      expect(within(sidebar).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(
      within(sidebar).getByRole('button', { name: /cerrar sesión/i }),
    ).toBeInTheDocument()
  })
})
