import type { ChatMessage } from '../partyService'

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'mock-msg-1',
    type: 'text',
    text: '¿Alguien vio el tema de integrales por partes? No entiendo nada 😅',
    userId: 'user-alex',
    user: { id: 'user-alex', username: 'alex', displayName: 'Alex', avatarUrl: null },
    attachment: null,
    createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
  },
  {
    id: 'mock-msg-2',
    type: 'text',
    text: 'Sí! Usás primero la integración por partes y después sustituís. Te comparto mis notas.',
    userId: 'user-jordan',
    user: { id: 'user-jordan', username: 'jordan', displayName: 'Jordan', avatarUrl: null },
    attachment: null,
    createdAt: new Date(Date.now() - 7 * 60_000).toISOString(),
  },
  {
    id: 'mock-msg-3',
    type: 'file',
    text: null,
    userId: 'user-sam',
    user: { id: 'user-sam', username: 'sam', displayName: 'Sam', avatarUrl: null },
    attachment: {
      url: '/uploads/mock-ejemplos.pdf',
      name: 'ejemplos-parcial.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 58231,
    },
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
]
