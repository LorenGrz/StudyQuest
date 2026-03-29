import { api } from './api'

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  text: string
  topic: string
  options: QuizOption[]
  order: number
}

export interface Quest {
  id: string
  partyId: string
  title: string
  status: 'pending' | 'active' | 'completed'
  leaderboard: Array<{ userId: string; username: string; score: number }>
  questions: QuizQuestion[]
  createdAt: string
}

export interface AnswerResult {
  isCorrect: boolean
  correctIndex: number
  explanation: string
  xpEarned: number
}

export interface CreateQuestPayload {
  partyId: string
  title: string
  subjectId: string
  noteText?: string
}

export const questService = {
  async create(payload: CreateQuestPayload, file?: File): Promise<Quest> {
    const form = new FormData()
    form.append('partyId', payload.partyId)
    form.append('title', payload.title)
    form.append('subjectId', payload.subjectId)
    if (payload.noteText) form.append('noteText', payload.noteText)
    if (file) form.append('file', file)

    const { data } = await api.post<Quest>('/quests', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async findByParty(partyId: string): Promise<Quest[]> {
    const { data } = await api.get<Quest[]>(`/quests/party/${partyId}`)
    return data
  },

  async getForPlay(questId: string): Promise<Quest> {
    const { data } = await api.get<Quest>(`/quests/${questId}/play`)
    return data
  },

  async start(questId: string): Promise<void> {
    await api.post(`/quests/${questId}/start`)
  },

  async submitAnswer(
    questionId: string,
    optionId: string,
    timeMs: number,
  ): Promise<AnswerResult> {
    const { data } = await api.post<AnswerResult>('/quests/answer', {
      questionId,
      optionId,
      timeMs,
    })
    return data
  },

  async complete(questId: string): Promise<void> {
    await api.post(`/quests/${questId}/complete`)
  },
}
