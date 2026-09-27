import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { Collapsible } from './UI'

describe('Collapsible', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts closed by default and toggles open/closed on click', () => {
    render(
      <Collapsible id="today" title="Quests para hoy">
        <p>Contenido</p>
      </Collapsible>,
    )

    const toggle = screen.getByRole('button', { name: /quests para hoy/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Contenido')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('honors defaultOpen when there is no stored preference', () => {
    render(
      <Collapsible id="recommended" title="Recomendados" defaultOpen>
        <p>Contenido</p>
      </Collapsible>,
    )

    expect(screen.getByRole('button', { name: /recomendados/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })

  it('persists the toggled state to localStorage under the section id', () => {
    render(
      <Collapsible id="today" title="Quests para hoy">
        <p>Contenido</p>
      </Collapsible>,
    )

    fireEvent.click(screen.getByRole('button', { name: /quests para hoy/i }))
    expect(localStorage.getItem('sq:collapsible:today')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: /quests para hoy/i }))
    expect(localStorage.getItem('sq:collapsible:today')).toBe('false')
  })

  it('reads a stored preference on mount, overriding defaultOpen', () => {
    localStorage.setItem('sq:collapsible:today', 'true')

    render(
      <Collapsible id="today" title="Quests para hoy" defaultOpen={false}>
        <p>Contenido</p>
      </Collapsible>,
    )

    expect(screen.getByRole('button', { name: /quests para hoy/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })

  it('shows the content when forceOpen is true even if collapsed by the user', () => {
    localStorage.setItem('sq:collapsible:today', 'false')

    render(
      <Collapsible id="today" title="Quests para hoy" forceOpen>
        <p>Contenido</p>
      </Collapsible>,
    )

    expect(screen.getByRole('button', { name: /quests para hoy/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })

  it('falls back to defaultOpen when localStorage throws on read or write', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    render(
      <Collapsible id="today" title="Quests para hoy" defaultOpen={false}>
        <p>Contenido</p>
      </Collapsible>,
    )

    const toggle = screen.getByRole('button', { name: /quests para hoy/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    expect(() => fireEvent.click(toggle)).not.toThrow()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})
