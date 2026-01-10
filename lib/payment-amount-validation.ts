/**
 * Payment Amount Validation System
 * Ensures payment amounts match expected subscription prices
 */

import prisma from "@/lib/prisma"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"

export interface AmountValidationResult {
  isValid: boolean
  expectedAmount: number
  actualAmount: number
  discrepancy: number
  discrepancyPercentage: number
  tolerance: number
  reason?: string
  suggestedAction: 'accept' | 'review' | 'reject'
}

export interface AmountValidationConfig {
  tolerancePercentage: number // e.g., 0.01 for 1%
  maxAbsoluteDifference: number // e.g., 100 kobo = 1 NGN
  allowOverpayment: boolean
  allowUnderpayment: boolean
}

export const DEFAULT_AMOUNT_VALIDATION_CONFIG: AmountValidationConfig = {
  tolerancePercentage: 0.02, // 2% tolerance for fees/rounding
  maxAbsoluteDifference: 500, // 5 NGN in kobo
  allowOverpayment: true,
  allowUnderpayment: false
}

/**
 * Validate payment amount against subscription plan price
 */
export async function validatePaymentAmount(
  subscriptionId: string,
  paymentAmount: number, // Amount in kobo (Paystack format)
  currency: string,
  config: Partial<AmountValidationConfig> = {}
): Promise<AmountValidationResult> {
  const finalConfig = { ...DEFAULT_AMOUNT_VALIDATION_CONFIG, ...config }

  // Get subscription with plan details
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true }
  })

  if (!subscription) {
    return {
      isValid: false,
      expectedAmount: 0,
      actualAmount: paymentAmount,
      discrepancy: paymentAmount,
      discrepancyPercentage: 100,
      tolerance: 0,
      reason: 'Subscription not found',
      suggestedAction: 'reject'
    }
  }

  // Convert plan price to kobo for comparison
  const expectedAmountKobo = subscription.plan.price * 100
  const discrepancy = paymentAmount - expectedAmountKobo
  const discrepancyPercentage = Math.abs(discrepancy) / expectedAmountKobo
  const tolerance = Math.max(
    expectedAmountKobo * finalConfig.tolerancePercentage,
    finalConfig.maxAbsoluteDifference
  )

  // Currency validation
  if (currency !== subscription.plan.currency) {
    return {
      isValid: false,
      expectedAmount: expectedAmountKobo,
      actualAmount: paymentAmount,
      discrepancy,
      discrepancyPercentage,
      tolerance,
      reason: `Currency mismatch: expected ${subscription.plan.currency}, got ${currency}`,
      suggestedAction: 'reject'
    }
  }

  // Check if within tolerance
  if (Math.abs(discrepancy) <= tolerance) {
    return {
      isValid: true,
      expectedAmount: expectedAmountKobo,
      actualAmount: paymentAmount,
      discrepancy,
      discrepancyPercentage,
      tolerance,
      suggestedAction: 'accept'
    }
  }

  // Check overpayment
  if (discrepancy > 0) {
    if (finalConfig.allowOverpayment) {
      return {
        isValid: true,
        expectedAmount: expectedAmountKobo,
        actualAmount: paymentAmount,
        discrepancy,
        discrepancyPercentage,
        tolerance,
        reason: `Overpayment of ${discrepancy} kobo (${(discrepancyPercentage * 100).toFixed(2)}%)`,
        suggestedAction: discrepancyPercentage > 0.1 ? 'review' : 'accept' // Review if >10% overpayment
      }
    } else {
      return {
        isValid: false,
        expectedAmount: expectedAmountKobo,
        actualAmount: paymentAmount,
        discrepancy,
        discrepancyPercentage,
        tolerance,
        reason: `Overpayment not allowed: ${discrepancy} kobo excess`,
        suggestedAction: 'reject'
      }
    }
  }

  // Check underpayment
  if (discrepancy < 0) {
    if (finalConfig.allowUnderpayment) {
      return {
        isValid: true,
        expectedAmount: expectedAmountKobo,
        actualAmount: paymentAmount,
        discrepancy,
        discrepancyPercentage,
        tolerance,
        reason: `Underpayment of ${Math.abs(discrepancy)} kobo (${(discrepancyPercentage * 100).toFixed(2)}%)`,
        suggestedAction: 'review'
      }
    } else {
      return {
        isValid: false,
        expectedAmount: expectedAmountKobo,
        actualAmount: paymentAmount,
        discrepancy,
        discrepancyPercentage,
        tolerance,
        reason: `Underpayment: ${Math.abs(discrepancy)} kobo short`,
        suggestedAction: 'reject'
      }
    }
  }

  // Should not reach here, but fallback
  return {
    isValid: false,
    expectedAmount: expectedAmountKobo,
    actualAmount: paymentAmount,
    discrepancy,
    discrepancyPercentage,
    tolerance,
    reason: 'Unknown validation error',
    suggestedAction: 'review'
  }
}

/**
 * Validate renewal payment amount (may include prorations)
 */
export async function validateRenewalAmount(
  subscriptionId: string,
  paymentAmount: number,
  currency: string,
  config: Partial<AmountValidationConfig> = {}
): Promise<AmountValidationResult> {
  // For renewals, we're more lenient with amount validation
  // as there might be prorations, discounts, or plan changes
  const renewalConfig = {
    ...DEFAULT_AMOUNT_VALIDATION_CONFIG,
    tolerancePercentage: 0.05, // 5% tolerance for renewals
    allowOverpayment: true,
    allowUnderpayment: true,
    ...config
  }

  return validatePaymentAmount(subscriptionId, paymentAmount, currency, renewalConfig)
}

/**
 * Log amount validation results
 */
export async function logAmountValidation(
  subscriptionId: string,
  paymentReference: string,
  validation: AmountValidationResult,
  userId?: string
): Promise<void> {
  const logData = {
    subscriptionId,
    paymentReference,
    expectedAmount: validation.expectedAmount,
    actualAmount: validation.actualAmount,
    discrepancy: validation.discrepancy,
    discrepancyPercentage: validation.discrepancyPercentage,
    isValid: validation.isValid,
    suggestedAction: validation.suggestedAction,
    reason: validation.reason
  }

  if (validation.isValid) {
    console.log('Payment amount validation passed:', logData)
  } else {
    console.warn('Payment amount validation failed:', logData)
    
    // Create audit log for failed validations
    await createAuditLog({
      userId: userId || 'system',
      action: AUDIT_ACTIONS.PAYMENT_AMOUNT_MISMATCH,
      details: logData
    })
  }

  // Log significant discrepancies even if valid
  if (validation.isValid && validation.discrepancyPercentage > 0.05) {
    console.warn('Significant payment amount discrepancy detected:', logData)
    
    await createAuditLog({
      userId: userId || 'system',
      action: AUDIT_ACTIONS.PAYMENT_AMOUNT_DISCREPANCY,
      details: logData
    })
  }
}

/**
 * Get payment amount statistics for monitoring
 */
export async function getAmountValidationStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalPayments: number
  validPayments: number
  invalidPayments: number
  averageDiscrepancy: number
  maxDiscrepancy: number
  overpayments: number
  underpayments: number
}> {
  // This would require storing validation results in the database
  // For now, return placeholder stats
  return {
    totalPayments: 0,
    validPayments: 0,
    invalidPayments: 0,
    averageDiscrepancy: 0,
    maxDiscrepancy: 0,
    overpayments: 0,
    underpayments: 0
  }
}