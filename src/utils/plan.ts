export const FREE_PLAN_SUBSCRIPTION_LIMIT = 5
export const PRO_PRICE_MONTHLY_CZK = 149
export const PRO_PRICE_YEARLY_CZK = 1290

export interface UserProfileData {
  plan: 'free' | 'pro'
  planExpiresAt: string | null
  referralCode: string
  isPublic: boolean
  importToken: string
  onboarded: boolean
  monthlyBudget: number | null
}
