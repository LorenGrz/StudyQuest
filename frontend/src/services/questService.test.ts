import { questService } from './questService'
import { api } from './api'

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
  },
}))

describe('questService.create', () => {
  beforeEach(() => vi.mocked(api.post).mockClear())

  it('sends the file plus optional instructions in the multipart payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'q1' } })
    const file = new File(['pdf'], 'apunte.pdf', { type: 'application/pdf' })

    await questService.create(
      {
        partyId: 'party-1',
        title: 'Quest prueba',
        instructions: 'foco en el capítulo 2',
      },
      file,
    )

    const [, form] = vi.mocked(api.post).mock.calls[0]
    expect(form).toBeInstanceOf(FormData)
    expect((form as FormData).get('partyId')).toBe('party-1')
    expect((form as FormData).get('title')).toBe('Quest prueba')
    expect((form as FormData).get('instructions')).toBe('foco en el capítulo 2')
    expect((form as FormData).get('file')).toBeInstanceOf(File)
    expect((form as FormData).get('textContent')).toBeNull()
  })

  it('omits the instructions field when none is given', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'q1' } })
    const file = new File(['pdf'], 'apunte.pdf', { type: 'application/pdf' })

    await questService.create({ partyId: 'p1', title: 'Q' }, file)

    const [, form] = vi.mocked(api.post).mock.calls[0]
    expect((form as FormData).get('instructions')).toBeNull()
  })
})
