import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SubjectList } from './SubjectComponents'
import type { Subject } from '../../services/userService'

const subject = (id: string, name: string, year: number): Subject => ({
  id,
  name,
  code: id.toUpperCase(),
  career: 'Medicina',
  university: 'UBA',
  year,
})

describe('SubjectList', () => {
  it('groups subjects under one heading per year, in ascending order', () => {
    render(
      <SubjectList
        subjects={[
          subject('a', 'Fisiología', 2),
          subject('b', 'Anatomía', 1),
          subject('c', 'Bioquímica', 2),
        ]}
        renderAction={() => null}
      />,
    )

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
    expect(headings).toEqual(['Año 1', 'Año 2'])
  })

  it('places each subject in its year group and labels the row with the year', () => {
    render(
      <SubjectList
        subjects={[subject('a', 'Anatomía', 1), subject('b', 'Fisiología', 2)]}
        renderAction={() => null}
      />,
    )

    const year1 = screen.getByRole('heading', { name: 'Año 1' })
      .parentElement as HTMLElement
    expect(within(year1).getByText('Anatomía')).toBeInTheDocument()
    expect(within(year1).queryByText('Fisiología')).toBeNull()
    expect(within(year1).getByText('Medicina · Año 1')).toBeInTheDocument()
  })

  it('shows the empty state when there are no subjects', () => {
    render(<SubjectList subjects={[]} renderAction={() => null} />)
    expect(screen.getByText('No se encontraron materias')).toBeInTheDocument()
  })
})
