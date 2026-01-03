/**
 * Proration calculation utilities for subscription plan changes
 */

export interface ProrationResult {
  amount: number
  description: string
  oldPlanDailyRate: number
  newPlanDailyRate: number
  remainingDays: number
  totalDays: number
  oldPlanCredit: number
  newPlanCharge: number
}

/**
 * Calculate proration for plan change
 * @param oldPlanPrice - Price of current plan
 * @param newPlanPrice - Price of new plan
 * @param periodStart - Start of current billing period
 * @param periodEnd - End of current billing period
 * @param changeDate - Date when plan change takes effect (default: now)
 * @returns Proration calculation result
 */
export function calculateProration(
  oldPlanPrice: number,
  newPlanPrice: number,
  periodStart: Date,
  periodEnd: Date,
  changeDate: Date = new Date()
): ProrationResult {
  // Calculate total days in billing period
  const totalDays = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate remaining days from change date to period end
  const remainingDays = Math.max(
    0,
    Math.ceil((periodEnd.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Calculate daily rates
  const oldPlanDailyRate = oldPlanPrice / totalDays
  const newPlanDailyRate = newPlanPrice / totalDays

  // Calculate credit for unused portion of old plan
  const oldPlanCredit = oldPlanDailyRate * remainingDays

  // Calculate charge for remaining days of new plan
  const newPlanCharge = newPlanDailyRate * remainingDays

  // Net proration amount (positive = charge, negative = credit)
  const prorationAmount = newPlanCharge - oldPlanCredit

  // Generate description
  const description = remainingDays > 0
    ? `Plan change proration: ${remainingDays} days remaining in billing period`
    : "Plan change (no proration - period ended)"

  return {
    amount: Math.round(prorationAmount * 100) / 100, // Round to 2 decimal places
    description,
    oldPlanDailyRate: Math.round(oldPlanDailyRate * 100) / 100,
    newPlanDailyRate: Math.round(newPlanDailyRate * 100) / 100,
    remainingDays,
    totalDays,
    oldPlanCredit: Math.round(oldPlanCredit * 100) / 100,
    newPlanCharge: Math.round(newPlanCharge * 100) / 100,
  }
}

/**
 * Check if plan change is an upgrade or downgrade
 */
export function isUpgrade(oldPlanPrice: number, newPlanPrice: number): boolean {
  return newPlanPrice > oldPlanPrice
}

/**
 * Check if plan change is a downgrade
 */
export function isDowngrade(oldPlanPrice: number, newPlanPrice: number): boolean {
  return newPlanPrice < oldPlanPrice
}

