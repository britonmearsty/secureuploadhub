/**
 * Subscription Linking Verification System
 * Ensures correct subscription is linked to payments
 */

import prisma from "@/lib/prisma"
import { SUBSCRIPTION_STATUS } from "@/lib/billing-constants"

export interface LinkingVerificationResult {
  isCorrect: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
  suggestedAction?: 'proceed' | 'manual_review' | 'reject'
  matchedBy: string[]
  warnings?: string[]
}

/**
 * Verify that a payment should be linked to a specific subscription
 */
export async function verifySubscriptionLinking(
  subscriptionId: string,
  paymentData: {
    reference: string
    amount: number
    currency: string
    userEmail?: string
    metadata?: any
  }
): Promise<LinkingVerificationResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { 
      plan: true, 
      user: true,
      payments: {
        where: { status: { in: ['COMPLETED', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  })

  if (!subscription) {
    return {
      isCorrect: false,
      confidence: 'high',
      reason: 'Subscription not found',
      suggestedAction: 'reject',
      matchedBy: []
    }
  }

  const matchedBy: string[] = []
  const warnings: string[] = []
  let confidence: 'high' | 'medium' | 'low' = 'low'

  // Check 1: Subscription status
  if (subscription.status !== SUBSCRIPTION_STATUS.INCOMPLETE) {
    warnings.push(`Subscription status is ${subscription.status}, not INCOMPLETE`)
  }

  // Check 2: User email match
  if (paymentData.userEmail && subscription.user.email === paymentData.userEmail) {
    matchedBy.push('user_email')
    confidence = 'medium'
  } else if (paymentData.userEmail) {
    warnings.push(`User email mismatch: payment=${paymentData.userEmail}, subscription=${subscription.user.email}`)
  }

  // Check 3: Amount match (convert from kobo to naira for Paystack)
  const expectedAmount = subscription.plan.price * 100 // Convert to kobo
  const amountTolerance = expectedAmount * 0.01 // 1% tolerance for fees
  
  if (Math.abs(paymentData.amount - expectedAmount) <= amountTolerance) {
    matchedBy.push('amount_exact')
    confidence = confidence === 'low' ? 'medium' : 'high'
  } else {
    warnings.push(`Amount mismatch: payment=${paymentData.amount}, expected=${expectedAmount} (±${amountTolerance})`)
  }

  // Check 4: Currency match
  if (paymentData.currency === subscription.plan.currency) {
    matchedBy.push('currency')
  } else {
    warnings.push(`Currency mismatch: payment=${paymentData.currency}, expected=${subscription.plan.currency}`)
  }

  // Check 5: Metadata subscription_id match
  if (paymentData.metadata?.subscription_id === subscriptionId) {
    matchedBy.push('metadata_subscription_id')
    confidence = 'high'
  }

  // Check 6: Recent payment pattern
  const recentPayments = subscription.payments.filter(p => 
    Math.abs(p.amount - (paymentData.amount / 100)) <= (paymentData.amount / 100) * 0.01
  )
  
  if (recentPayments.length > 0) {
    warnings.push(`Found ${recentPayments.length} recent payments with similar amounts`)
  }

  // Check 7: Duplicate reference check
  const existingPayment = await prisma.payment.findFirst({
    where: { providerPaymentRef: paymentData.reference }
  })

  if (existingPayment && existingPayment.subscriptionId !== subscriptionId) {
    return {
      isCorrect: false,
      confidence: 'high',
      reason: `Payment reference ${paymentData.reference} already linked to different subscription ${existingPayment.subscriptionId}`,
      suggestedAction: 'reject',
      matchedBy: [],
      warnings: ['duplicate_reference']
    }
  }

  // Determine final result
  let isCorrect = false
  let suggestedAction: 'proceed' | 'manual_review' | 'reject' = 'reject'

  if (matchedBy.includes('metadata_subscription_id')) {
    // High confidence if metadata matches
    isCorrect = true
    suggestedAction = 'proceed'
    confidence = 'high'
  } else if (matchedBy.includes('user_email') && matchedBy.includes('amount_exact')) {
    // Medium confidence if email and amount match
    isCorrect = true
    suggestedAction = warnings.length > 1 ? 'manual_review' : 'proceed'
    confidence = warnings.length > 1 ? 'medium' : 'high'
  } else if (matchedBy.length >= 2) {
    // Low confidence but some matches
    isCorrect = true
    suggestedAction = 'manual_review'
    confidence = 'low'
  }

  return {
    isCorrect,
    confidence,
    reason: isCorrect 
      ? `Matched by: ${matchedBy.join(', ')}` 
      : `Insufficient matches. Found: ${matchedBy.join(', ')}`,
    suggestedAction,
    matchedBy,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Find the best subscription match for a payment
 */
export async function findBestSubscriptionMatch(
  paymentData: {
    reference: string
    amount: number
    currency: string
    userEmail?: string
    metadata?: any
  }
): Promise<{
  subscriptionId?: string
  verification: LinkingVerificationResult
  alternatives?: Array<{ subscriptionId: string; verification: LinkingVerificationResult }>
}> {
  // First, try metadata subscription_id if available
  if (paymentData.metadata?.subscription_id) {
    const verification = await verifySubscriptionLinking(
      paymentData.metadata.subscription_id,
      paymentData
    )
    
    if (verification.isCorrect && verification.confidence === 'high') {
      return {
        subscriptionId: paymentData.metadata.subscription_id,
        verification
      }
    }
  }

  // Find candidate subscriptions
  const candidates: string[] = []

  // By user email
  if (paymentData.userEmail) {
    const user = await prisma.user.findUnique({
      where: { email: paymentData.userEmail }
    })

    if (user) {
      const userSubscriptions = await prisma.subscription.findMany({
        where: {
          userId: user.id,
          status: SUBSCRIPTION_STATUS.INCOMPLETE
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 3 // Limit to recent subscriptions
      })

      candidates.push(...userSubscriptions.map(s => s.id))
    }
  }

  // By amount (if no email candidates)
  if (candidates.length === 0) {
    const expectedPrice = paymentData.amount / 100 // Convert from kobo
    const amountSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATUS.INCOMPLETE,
        plan: {
          price: {
            gte: expectedPrice * 0.99,
            lte: expectedPrice * 1.01
          },
          currency: paymentData.currency
        }
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    candidates.push(...amountSubscriptions.map(s => s.id))
  }

  // Verify each candidate
  const verifications = await Promise.all(
    candidates.map(async (subscriptionId) => ({
      subscriptionId,
      verification: await verifySubscriptionLinking(subscriptionId, paymentData)
    }))
  )

  // Sort by confidence and correctness
  const sortedVerifications = verifications
    .filter(v => v.verification.isCorrect)
    .sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      return confidenceOrder[b.verification.confidence] - confidenceOrder[a.verification.confidence]
    })

  if (sortedVerifications.length === 0) {
    return {
      verification: {
        isCorrect: false,
        confidence: 'high',
        reason: 'No matching subscriptions found',
        suggestedAction: 'reject',
        matchedBy: []
      }
    }
  }

  const best = sortedVerifications[0]
  const alternatives = sortedVerifications.slice(1, 3) // Top 2 alternatives

  return {
    subscriptionId: best.subscriptionId,
    verification: best.verification,
    alternatives: alternatives.length > 0 ? alternatives : undefined
  }
}

/**
 * Log subscription linking verification results
 */
export function logLinkingVerification(
  reference: string,
  subscriptionId: string,
  verification: LinkingVerificationResult
): void {
  const logData = {
    reference,
    subscriptionId,
    confidence: verification.confidence,
    matchedBy: verification.matchedBy,
    suggestedAction: verification.suggestedAction,
    warnings: verification.warnings
  }

  if (verification.isCorrect) {
    console.log(`Subscription linking verified:`, logData)
  } else {
    console.warn(`Subscription linking failed:`, { ...logData, reason: verification.reason })
  }
}