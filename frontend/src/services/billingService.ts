import { api } from './api'

export type Plan = 'free' | 'pro'
export type PlanSource = 'default' | 'promo' | 'admin' | 'mercadopago'

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

/** Price of 30 days of Pro via Mercado Pago; `available: false` when payments are off. */
export type ProQuote =
  | { available: true; usd: number; amountArs: number; fxRate: number; days: number }
  | { available: false }

export interface CheckoutResult {
  paymentId: string
  /** Mercado Pago Checkout Pro URL to redirect to. */
  initPoint: string
  amountArs: number
  fxRate: number
  usd: number
}

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'

export interface PaymentView {
  id: string
  status: PaymentStatus
  amountArs: number
  /** Set once the Pro days were granted. */
  appliedAt: string | null
  /** Paid but held for manual review (e.g. amount mismatch): show support, stop waiting. */
  needsSupport: boolean
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

  async getQuote(): Promise<ProQuote> {
    const { data } = await api.get<ProQuote>('/payments/quote')
    return data
  },

  async createCheckout(): Promise<CheckoutResult> {
    const { data } = await api.post<CheckoutResult>('/payments/checkout')
    return data
  },

  /**
   * `hint` = the `payment_id` Mercado Pago appends to the return URL; the
   * backend verifies it with MP before using it.
   */
  async getPayment(id: string, hint?: string): Promise<PaymentView> {
    const { data } = await api.get<PaymentView>(
      `/payments/${encodeURIComponent(id)}`,
      hint ? { params: { hint } } : undefined,
    )
    return data
  },
}
