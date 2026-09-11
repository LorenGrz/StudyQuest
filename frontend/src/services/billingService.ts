import { api } from './api'

export type Plan = 'free' | 'pro'
export type PlanSource = 'default' | 'promo' | 'admin'

export interface PlanLimits {
  questsPerDay: number
  maxUploadMb: number
  maxInstructionsChars: number
  aiModelTier: 'lite' | 'full'
  partySizeMax: number
  studyBotEnabled: boolean
}

export interface PlanDescriptor {
  id: Plan
  name: string
  blurb: string
  perks: string[]
  limits: PlanLimits
}

export interface BillingState {
  plan: Plan
  effectivePlan: Plan
  planExpiresAt: string | null
  planSource: PlanSource | null
  limits: PlanLimits
  usage: { questsToday: number; questsPerDay: number }
}

export const billingService = {
  async getState(): Promise<BillingState> {
    const { data } = await api.get<BillingState>('/billing/me')
    return data
  },

  async getPlans(): Promise<PlanDescriptor[]> {
    const { data } = await api.get<PlanDescriptor[]>('/billing/plans')
    return data
  },

  async redeem(code: string): Promise<BillingState> {
    const { data } = await api.post<BillingState>('/billing/redeem', { code })
    return data
  },
}
