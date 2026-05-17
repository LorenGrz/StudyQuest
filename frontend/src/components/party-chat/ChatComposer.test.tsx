import { fireEvent, render, screen } from '@testing-library/react'
import { ChatComposer } from './ChatComposer'

describe('ChatComposer', () => {
  it('uses a multiline field for the message body', () => {
    render(
      <ChatComposer
        onSendText={vi.fn()}
        onSendFile={vi.fn(async () => undefined)}
        onSendAudio={vi.fn(async () => undefined)}
      />,
    )

    expect(screen.getByPlaceholderText(/escribí un mensaje/i).tagName).toBe('TEXTAREA')
  })

  it('shows the microphone action when the input is empty', () => {
    render(
      <ChatComposer
        onSendText={vi.fn()}
        onSendFile={vi.fn(async () => undefined)}
        onSendAudio={vi.fn(async () => undefined)}
      />,
    )

    expect(screen.getByRole('button', { name: /grabar nota de voz/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar mensaje/i })).not.toBeInTheDocument()
  })

  it('switches to the send action when the user types a message', () => {
    render(
      <ChatComposer
        onSendText={vi.fn()}
        onSendFile={vi.fn(async () => undefined)}
        onSendAudio={vi.fn(async () => undefined)}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/escribí un mensaje/i), {
      target: { value: 'Hola StudyQuest' },
    })

    expect(screen.getByRole('button', { name: /enviar mensaje/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /grabar nota de voz/i })).not.toBeInTheDocument()
  })

  it('shows a validation error for unsupported file types', async () => {
    const { container } = render(
      <ChatComposer
        onSendText={vi.fn()}
        onSendFile={vi.fn(async () => undefined)}
        onSendAudio={vi.fn(async () => undefined)}
      />,
    )

    const input = container.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
    if (!input) throw new Error('Expected file input to exist')
    const file = new File(['x'], 'image.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText(/solo pdf, txt, doc o docx/i)).toBeInTheDocument()
  })
})
