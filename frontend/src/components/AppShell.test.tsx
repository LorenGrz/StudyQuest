import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('exposes primary destinations with correct names', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell><div>Content</div></AppShell>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link', { name: 'Inicio' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Match' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Parties' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Perfil' }).length).toBeGreaterThan(0)
  })

  it('marks the current destination', () => {
    render(
      <MemoryRouter initialEntries={['/parties']}>
        <AppShell><div>Content</div></AppShell>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link', { name: 'Parties' })[0]).toHaveAttribute('aria-current', 'page')
  })
})
