import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { QuestCard } from './PartyComponents'

describe('QuestCard', () => {
  it('shows a link to the uploaded PDF, question count, and the best score summary', () => {
    render(
      <MemoryRouter>
        <QuestCard
          quest={{
            id: 'quest-1',
            partyId: 'party-1',
            subjectId: 'subject-1',
            title: 'Bases de datos',
            status: 'completed',
            questionCount: 12,
            myBestScore: 870,
            myStatus: 'completed',
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
    expect(screen.getByText(/12 preguntas/i)).toBeInTheDocument()
    expect(screen.getByText(/mejor puntaje: 870/i)).toBeInTheDocument()
  })

  it('shows an explicit generating state and guidance while the AI is still creating the quest', () => {
    render(
      <MemoryRouter>
        <QuestCard
          quest={{
            id: 'quest-generating',
            partyId: 'party-1',
            subjectId: 'subject-1',
            title: 'Agentes de IA',
            status: 'generating',
            questionCount: 0,
            myStatus: 'never_started',
            leaderboard: [],
            questions: [],
            createdAt: new Date().toISOString(),
          } as any}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/generando con ia/i)).toBeInTheDocument()
    expect(screen.getByText(/volvé a esta party en unos segundos/i)).toBeInTheDocument()
  })
})
