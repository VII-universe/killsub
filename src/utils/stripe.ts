import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

// Lazily constructed so the app doesn't crash at import time in environments
// (like `next build`) where STRIPE_SECRET_KEY isn't set yet.
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('Chybí STRIPE_SECRET_KEY v prostředí.')
    }
    stripeInstance = new Stripe(secretKey)
  }
  return stripeInstance
}
