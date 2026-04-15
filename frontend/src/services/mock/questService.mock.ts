import type { Quest, AnswerResult } from '../questService'

export const mockQuest: Quest = {
  id: 'mock-1',
  partyId: 'party-1',
  title: 'Computer Science Basics',
  status: 'active',
  createdAt: new Date().toISOString(),
  leaderboard: [
    { userId: '1', username: 'alice', score: 1250 },
    { userId: '2', username: 'bob',   score: 980  },
    { userId: '3', username: 'carol', score: 720  },
  ],
  questions: [
    {
      id: 'q1',
      order: 0,
      text: '¿Qué algoritmo tiene peor caso O(n²)?',
      topic: 'Computer Science',
      options: [
        { id: 'a', text: 'Merge Sort' },
        { id: 'b', text: 'Quick Sort' },
        { id: 'c', text: 'Bubble Sort' },
        { id: 'd', text: 'Heap Sort' },
      ],
    },
    {
      id: 'q2',
      order: 1,
      text: '¿Qué estructura de datos usa LIFO?',
      topic: 'Estructuras de datos',
      options: [
        { id: 'a', text: 'Queue' },
        { id: 'b', text: 'Stack' },
        { id: 'c', text: 'Linked List' },
        { id: 'd', text: 'Binary Tree' },
      ],
    },
    {
      id: 'q3',
      order: 2,
      text: '¿Complejidad de búsqueda en un BST balanceado?',
      topic: 'Algoritmos',
      options: [
        { id: 'a', text: 'O(1)' },
        { id: 'b', text: 'O(n)' },
        { id: 'c', text: 'O(log n)' },
        { id: 'd', text: 'O(n²)' },
      ],
    },
  ],
}

export const mockAnswerResult = (optionId: string, correctId: string): AnswerResult => ({
  isCorrect: optionId === correctId,
  correctIndex: 2,
  explanation: 'Respuesta mock — conectá el backend para ver la explicación real.',
  xpEarned: optionId === correctId ? 150 : 0,
})