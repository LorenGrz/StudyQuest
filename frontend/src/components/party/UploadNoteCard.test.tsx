import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UploadNoteCard } from './UploadNoteCard'

const openForm = () =>
  fireEvent.click(screen.getByRole('button', { name: /crear quest con ia/i }))

const selectFile = (file: File) => {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(fileInput, { target: { files: [file] } })
}

describe('UploadNoteCard', () => {
  it('requires a file (it is the quiz source)', async () => {
    const onUpload = vi.fn()

    render(<UploadNoteCard onUpload={onUpload} isLoading={false} />)
    openForm()
    fireEvent.change(screen.getByLabelText(/título del quiz/i), {
      target: { value: 'Bases de datos' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generar quest/i }))

    expect(await screen.findByText(/subí un archivo/i)).toBeInTheDocument()
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('submits with just a file when no instructions are given', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined)
    const file = new File(['pdf'], 'apunte.pdf', { type: 'application/pdf' })

    render(<UploadNoteCard onUpload={onUpload} isLoading={false} />)
    openForm()
    fireEvent.change(screen.getByLabelText(/título del quiz/i), {
      target: { value: 'Bases de datos' },
    })
    selectFile(file)
    fireEvent.click(screen.getByRole('button', { name: /generar quest/i }))

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith('Bases de datos', file, undefined)
    })
  })

  it('passes the instructions text through without any minimum length', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined)
    const file = new File(['docx'], 'apunte.docx')

    render(<UploadNoteCard onUpload={onUpload} isLoading={false} />)
    openForm()
    fireEvent.change(screen.getByLabelText(/título del quiz/i), {
      target: { value: 'SO' },
    })
    selectFile(file)
    fireEvent.change(screen.getByLabelText(/instrucciones \/ temas/i), {
      target: { value: 'solo cap 3' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generar quest/i }))

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith('SO', file, 'solo cap 3')
    })
  })

  it('rejects an unsupported file type', async () => {
    const onUpload = vi.fn()
    const file = new File(['x'], 'virus.exe')

    render(<UploadNoteCard onUpload={onUpload} isLoading={false} />)
    openForm()
    selectFile(file)

    expect(await screen.findByText(/formato no soportado/i)).toBeInTheDocument()
  })

  it('shows backend error messages returned by onUpload', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('No se pudo generar'))
    const file = new File(['pdf'], 'apunte.pdf', { type: 'application/pdf' })

    render(<UploadNoteCard onUpload={onUpload} isLoading={false} />)
    openForm()
    fireEvent.change(screen.getByLabelText(/título del quiz/i), {
      target: { value: 'Bases de datos' },
    })
    selectFile(file)
    fireEvent.click(screen.getByRole('button', { name: /generar quest/i }))

    await waitFor(() => {
      expect(screen.getByText('No se pudo generar')).toBeInTheDocument()
    })
  })
})
