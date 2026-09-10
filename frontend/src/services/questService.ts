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
  position: number
}

export interface QuestAttempt {
  id: string
  attemptNumber: number
  status: 'in_progress' | 'completed' | 'abandoned'
  answeredQuestionIndices: number[]
  currentIndex: number
  score: number
  correctAnswers: number
  totalQuestions: number
  resumed?: boolean
  completedAt?: string | null
}

export interface Quest {
  id: string
  partyId: string
  subjectId: string
  title: string
  status: 'pending' | 'generating' | 'ready' | 'active' | 'completed' | 'failed'
  sourcePdfUrl?: string | null
  sourceType?: 'text' | 'pdf'
  questionCount?: number
  myBestScore?: number | null
  myLastScore?: number | null
  myStatus?: 'never_started' | 'in_progress' | 'completed'
  activeAttempt?: QuestAttempt | null
  latestAttempt?: QuestAttempt | null
  leaderboard: Array<{ userId: string; username: string; score: number }>
  questions: QuizQuestion[]
  createdAt: string
}

export interface AnswerResult {
  attemptId?: string
  isCorrect: boolean
  correctIndex: number
  explanation: string
  xpEarned: number
  newlyUnlockedNodeIds?: string[]
}

export interface CreateQuestPayload {
  partyId: string
  title: string
  /** Optional topic/focus guidance for the questions — not the study source. */
  instructions?: string
}

export const questService = {
  async create(payload: CreateQuestPayload, file: File): Promise<Quest> {
    const form = new FormData()
    form.append('partyId', payload.partyId)
    form.append('title', payload.title)
    if (payload.instructions) form.append('instructions', payload.instructions)
    form.append('file', file)

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

  async start(questId: string): Promise<QuestAttempt> {
    const { data } = await api.post<QuestAttempt>(`/quests/${questId}/start`)
    return data
  },

  async submitAnswer(
    questId: string,
    attemptId: string,
    questionIndex: number,
    selectedOption: number,
    timeSpentMs: number,
  ): Promise<AnswerResult> {
    const { data } = await api.post<AnswerResult>('/quests/answer', {
      questId,
      attemptId,
      questionIndex,
      selectedOption,
      timeSpentMs,
    })
    return data
  },

  async complete(questId: string): Promise<Quest> {
    const { data } = await api.post<Quest>(`/quests/${questId}/complete`)
    return data
  },

  async delete(questId: string): Promise<void> {
    await api.delete(`/quests/${questId}`)
  },
}
