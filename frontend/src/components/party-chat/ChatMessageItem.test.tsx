import { render, screen } from '@testing-library/react'
import { ChatMessageItem } from './ChatMessageItem'
import { normalizeChatMessage } from '../../services/partyService'

describe('ChatMessageItem', () => {
  it('renders a downloadable PDF attachment', () => {
    render(
      <ChatMessageItem
        message={normalizeChatMessage({
          id: 'm1',
          type: 'file',
          text: null,
          userId: 'u1',
          createdAt: '2026-05-16T12:00:00.000Z',
          attachment: {
            url: '/uploads/guide.pdf',
            name: 'guide.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 4096,
          },
          user: { id: 'u1', username: 'loren', displayName: 'Loren', avatarUrl: null },
        })}
        isOwn={false}
      />,
    )

    expect(screen.getByRole('link', { name: /guide\.pdf/i })).toHaveAttribute('href', 'http://localhost:3000/uploads/guide.pdf')
  })

  it('renders an audio player for audio messages', () => {
    const { container } = render(
      <ChatMessageItem
        message={normalizeChatMessage({
          id: 'm2',
          type: 'audio',
          text: null,
          userId: 'u1',
          createdAt: '2026-05-16T12:10:00.000Z',
          attachment: {
            url: '/uploads/voice.webm',
            name: 'voice.webm',
            mimeType: 'audio/webm',
            sizeBytes: 2048,
            durationMs: 9000,
          },
          user: { id: 'u1', username: 'loren', displayName: 'Loren', avatarUrl: null },
        })}
        isOwn
      />,
    )

    expect(container.querySelector('audio')).toHaveAttribute('src', 'http://localhost:3000/uploads/voice.webm')
  })
})
