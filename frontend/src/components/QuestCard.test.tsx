import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { QuestCard } from './PartyComponents'

describe('QuestCard', () => {
  it('shows a link to the uploaded PDF when the quest has one', () => {
    render(
      <MemoryRouter>
        <QuestCard
          quest={{
            id: 'quest-1',
            partyId: 'party-1',
            subjectId: 'subject-1',
            title: 'Bases de datos',
            status: 'ready',
            leaderboard: [],
            questions: [],
            createdAt: new Date().toISOString(),
            sourcePdfUrl: '/uploads/bases-datos.pdf',
          } as any}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: /ver pdf/i }),
    ).toHaveAttribute('href', 'http://localhost:3000/uploads/bases-datos.pdf')
  })
})
