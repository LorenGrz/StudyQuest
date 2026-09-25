import { api } from './api'

export const studyBotService = {
  async ask(question: string): Promise<string> {
    const { data } = await api.post<{ answer: string }>('/study-bot/ask', {
      question,
    })
    return data.answer
  },
}
