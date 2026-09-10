/**
 * Subscription plans. Manual tiers for now — no payment processor. A user's plan
 * is granted by a promo code or by an admin; it lapses back to `free` once
 * `planExpiresAt` passes. This file is the single source of truth for the
 * per-plan limits; the numbers can be overridden per environment.
 */

export const PLANS = ['free', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

export type PlanSource = 'default' | 'promo' | 'admin';

export interface PlanLimits {
  /** AI quests a user can generate per rolling 24 h. */
  questsPerDay: number;
  /** Max size of an uploaded source document. */
  maxUploadMb: number;
  /** Max length of the free-text "instrucciones / temas" field. */
  maxInstructionsChars: number;
  /** `full` unlocks the stronger Gemini model for generation. */
  aiModelTier: 'lite' | 'full';
  /** Max members in a party the user creates. */
  partySizeMax: number;
}

const envInt = (key: string, fallback: number): number => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function planLimits(plan: Plan): PlanLimits {
  if (plan === 'pro') {
    return {
      questsPerDay: envInt('PLAN_PRO_QUESTS_PER_DAY', 100),
      maxUploadMb: envInt('PLAN_PRO_UPLOAD_MB', 25),
      maxInstructionsChars: 1500,
      aiModelTier: 'full',
      partySizeMax: 8,
    };
  }
  return {
    // Falls back to the legacy QUEST_DAILY_LIMIT so nothing regresses.
    questsPerDay: envInt(
      'PLAN_FREE_QUESTS_PER_DAY',
      envInt('QUEST_DAILY_LIMIT', 20),
    ),
    maxUploadMb: envInt('PLAN_FREE_UPLOAD_MB', 10),
    maxInstructionsChars: 500,
    aiModelTier: 'lite',
    partySizeMax: 6,
  };
}

export interface PlanDescriptor {
  id: Plan;
  name: string;
  blurb: string;
  perks: string[];
  limits: PlanLimits;
}

export function planCatalog(): PlanDescriptor[] {
  return [
    {
      id: 'free',
      name: 'Free',
      blurb: 'Para arrancar a estudiar sin pagar nada.',
      perks: [
        `${planLimits('free').questsPerDay} quests con IA por día`,
        `Archivos de hasta ${planLimits('free').maxUploadMb} MB`,
        'Instrucciones de hasta 500 caracteres',
        'Modelo de IA estándar',
        'Parties de hasta 6 integrantes',
      ],
      limits: planLimits('free'),
    },
    {
      id: 'pro',
      name: 'Pro',
      blurb: 'Más generaciones, archivos más grandes y mejor modelo.',
      perks: [
        `${planLimits('pro').questsPerDay} quests con IA por día`,
        `Archivos de hasta ${planLimits('pro').maxUploadMb} MB`,
        'Instrucciones de hasta 1500 caracteres',
        'Modelo de IA avanzado (respuestas más precisas)',
        'Parties de hasta 8 integrantes',
      ],
      limits: planLimits('pro'),
    },
  ];
}

/** `pro` only while it hasn't lapsed. */
export function effectivePlan(user: {
  plan?: string | null;
  planExpiresAt?: Date | string | null;
}): Plan {
  if (user.plan !== 'pro') return 'free';
  if (!user.planExpiresAt) return 'pro';
  const expires = new Date(user.planExpiresAt).getTime();
  return Number.isFinite(expires) && expires > Date.now() ? 'pro' : 'free';
}
