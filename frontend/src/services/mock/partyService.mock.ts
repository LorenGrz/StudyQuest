import type { ChatMessage } from '../partyService'

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'mock-msg-1',
    text: '¿Alguien vio el tema de integrales por partes? No entiendo nada 😅',
    userId: 'user-alex',
    user: { id: 'user-alex', username: 'alex', displayName: 'Alex', avatarUrl: null },
    createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
  },
  {
    id: 'mock-msg-2',
    text: 'Sí! Usás primero la integración por partes y después sustituís. Te comparto mis notas.',
    userId: 'user-jordan',
    user: { id: 'user-jordan', username: 'jordan', displayName: 'Jordan', avatarUrl: null },
    createdAt: new Date(Date.now() - 7 * 60_000).toISOString(),
  },
  {
    id: 'mock-msg-3',
    text: 'Acá hay un PDF con ejemplos que me ayudaron bastante para el parcial anterior.',
    userId: 'user-sam',
    user: { id: 'user-sam', username: 'sam', displayName: 'Sam', avatarUrl: null },
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
]
