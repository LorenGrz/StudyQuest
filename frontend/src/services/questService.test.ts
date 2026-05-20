import { questService } from './questService'
import { api } from './api'

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
  },
}))

describe('questService.create', () => {
  it('sends textContent and omits subjectId in multipart payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'q1' } })

    await questService.create({
      partyId: 'party-1',
      title: 'Quest prueba',
      textContent: 'Texto largo de prueba',
    })

    const [, form] = vi.mocked(api.post).mock.calls[0]
    expect(form).toBeInstanceOf(FormData)
    expect((form as FormData).get('partyId')).toBe('party-1')
    expect((form as FormData).get('title')).toBe('Quest prueba')
    expect((form as FormData).get('textContent')).toBe('Texto largo de prueba')
    expect((form as FormData).get('subjectId')).toBeNull()
    expect((form as FormData).get('noteText')).toBeNull()
  })
})
