import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UploadNoteCard } from './UploadNoteCard'

describe('UploadNoteCard', () => {
  it('shows a validation error for short text without a PDF', async () => {
    const onUpload = vi.fn()

    render(<UploadNoteCard onUpload={onUpload} isLoading={false} />)

    fireEvent.click(screen.getByRole('button', { name: /crear quest con ia/i }))
    fireEvent.change(screen.getByLabelText(/título del quiz/i), {
      target: { value: 'Bases de datos' },
    })
    fireEvent.change(screen.getByLabelText(/texto del apunte/i), {
      target: { value: 'bases de datos' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generar quest/i }))

    expect(
      await screen.findByText(/el texto es muy corto/i),
    ).toBeInTheDocument()
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('submits successfully when a PDF is selected and the note text is empty', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined)
    const file = new File(['pdf-content'], 'apunte.pdf', { type: 'application/pdf' })

    render(<UploadNoteCard onUpload={onUpload} isLoading={false} />)

    fireEvent.click(screen.getByRole('button', { name: /crear quest con ia/i }))
    fireEvent.change(screen.getByLabelText(/título del quiz/i), {
      target: { value: 'Bases de datos' },
    })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /generar quest/i }))

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith('Bases de datos', file, undefined)
    })
  })

  it('shows backend error messages returned by onUpload', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('No se pudo generar'))

    render(<UploadNoteCard onUpload={onUpload} isLoading={false} />)

    fireEvent.click(screen.getByRole('button', { name: /crear quest con ia/i }))
    fireEvent.change(screen.getByLabelText(/título del quiz/i), {
      target: { value: 'Bases de datos' },
    })
    fireEvent.change(screen.getByLabelText(/texto del apunte/i), {
      target: {
        value:
          'Bases de datos relacionales con SQL, joins, indices, claves primarias, claves foraneas y normalizacion.',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /generar quest/i }))

    await waitFor(() => {
      expect(screen.getByText('No se pudo generar')).toBeInTheDocument()
    })
  })
})
