import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Alert, EmptyState, PageHeader } from './PagePrimitives'

describe('page primitives', () => {
  it('renders a page header with title and action', () => {
    render(<PageHeader title="Materias" action={<button>Nueva</button>} />)
    expect(screen.getByRole('heading', { name: 'Materias' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva' })).toBeInTheDocument()
  })

  it('renders an actionable error state', () => {
    render(<Alert title="No pudimos cargar las quests" actionLabel="Reintentar" onAction={() => {}} />)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('renders one primary empty-state action', () => {
    render(<EmptyState icon="📚" title="Sin materias" action={<button>Explorar</button>} />)
    expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument()
  })
})
