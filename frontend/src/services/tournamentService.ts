import { api } from './api'

export interface TournamentQuest {
  id: string
  title: string
}

export interface TournamentParticipantParty {
  id: string
  subject?: {
    id: string
    name: string
    code: string
  }
}

export interface TournamentParticipant {
  id: string
  tournamentId: string
  partyId: string
  score: number
  joinedAt: string
  party: TournamentParticipantParty
}

export interface Tournament {
  id: string
  title: string
  questId: string
  creatorPartyId: string
  status: 'pending' | 'active' | 'finished'
  startsAt: string
  endsAt: string
  createdAt: string
  updatedAt: string
  quest?: TournamentQuest
  participants?: TournamentParticipant[]
}

export interface ScoreboardEntry {
  rank: number
  partyId: string
  partyName: string
  score: number
}

export const tournamentService = {
  async getAll(): Promise<Tournament[]> {
    const { data } = await api.get<Tournament[]>('/tournaments')
    return data
  },

  async getById(id: string): Promise<Tournament> {
    const { data } = await api.get<Tournament>(`/tournaments/${id}`)
    return data
  },

  async create(payload: {
    title: string
    questId: string
    startsAt: string
    endsAt: string
  }): Promise<Tournament> {
    const { data } = await api.post<Tournament>('/tournaments', payload)
    return data
  },

  async join(id: string): Promise<Tournament> {
    const { data } = await api.post<Tournament>(`/tournaments/${id}/join`)
    return data
  },

  async getScoreboard(id: string): Promise<ScoreboardEntry[]> {
    const { data } = await api.get<ScoreboardEntry[]>(`/tournaments/${id}/scoreboard`)
    return data
  },
}
