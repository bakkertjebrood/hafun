import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function useStripe(): Stripe {
  if (!_stripe) {
    const config = useRuntimeConfig()
    if (!config.stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    _stripe = new Stripe(config.stripeSecretKey)
  }
  return _stripe
}

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  price_1TSuWKL54x6ogFX4sTBvQHXO: 'starter',
  price_1TSuWLL54x6ogFX4lOhU8KWz: 'professional',
  price_1TSuWML54x6ogFX4xBoUFQro: 'enterprise'
}

export function getPlanFromPriceId(priceId: string): string | null {
  return PRICE_TO_PLAN[priceId] || null
}

export const PLAN_LIMITS: Record<string, { maxBerths: number }> = {
  starter: { maxBerths: 50 },
  professional: { maxBerths: 200 },
  enterprise: { maxBerths: Infinity }
}

/**
 * Hafun's platform-fee in basis points on every Connect transaction
 * (passant payments, waitlist application fees). 5% by default — override
 * via STRIPE_PLATFORM_FEE_BPS env if needed.
 */
export function getPlatformFeeBps(): number {
  const raw = process.env.STRIPE_PLATFORM_FEE_BPS
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) ? parsed : 500
}

export function calcApplicationFee(amountCents: number): number {
  return Math.round((amountCents * getPlatformFeeBps()) / 10_000)
}
