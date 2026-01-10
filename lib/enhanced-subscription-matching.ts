/**
 * Enhanced Subscription Matching for Webhooks
 * Prevents wrong subscription activation with priority scoring
 */

import prisma from "@/lib/prisma"
import { SUBSCRIPTION_STATUS } from "@/lib/billing-constants"
import redis from "@/lib/redis"

export interface SubscriptionMatch {
  subscriptionId: string
  confidence: number // 0-100
  matchReasons: string[]
  warnings: string[]
  priority: number // Higher = better match
}

export interface PaymentCorrelationData {
  reference: string
  amount: number
  currency: string
  userEmail?: string
  metadata?: any
  paymentId: string
}

/**
 * Find the best subscription match with priority scoring
 */
export async function findBestSubscriptionMatchEnhanced(
  correlationData: PaymentCorrelationData
): Promise<SubscriptionMatch | null> {
  const candidates: SubscriptionMatch[] = []

  // 1. Redis mapping (highest priority - 100 confidence)
  try {
    const redisKey = `paystack:ref:${correlationData.reference}`
    const mapping = await redis.get(redisKey)
    if (mapping) {
      const parsed = JSON.parse(mapping)
      const subscription = await prisma.subscription.findUnique({
        where: { id: parsed.subscriptionId },
        include: { plan: true, user: true }
      })

      if (subscription && subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
        candidates.push({
          subscriptionId: subscription.id,
          confidence: 100,
          matchReasons: ['redis_reference_mapping'],
          warnings: [],
          priority: 1000
        })
      }
    }
  } catch (error) {
    console.warn('Redis mapping lookup failed:', error)
  }

  // 2. Metadata subscription_id (high priority - 95 confidence)
  if (correlationData.metadata?.subscription_id) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: correlationData.metadata.subscription_id },
      include: { plan: true, user: true }
    })

    if (subscription && subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
      const warnings = []
      
      // Validate metadata consistency
      if (correlationData.userEmail && subscription.user.email !== correlationData.userEmail) {
        warnings.push(`Email mismatch: metadata=${correlationData.userEmail}, subscription=${subscription.user.email}`)
      }
      
      const expectedAmount = subscription.plan.price * 100 // Convert to kobo
      if (Math.abs(correlationData.amount - expectedAmount) > expectedAmount * 0.05) {
        warnings.push(`Amount mismatch: payment=${correlationData.amount}, expected=${expectedAmount}`)
      }

      candidates.push({
        subscriptionId: subscription.id,
        confidence: warnings.length > 0 ? 85 : 95,
        matchReasons: ['metadata_subscription_id'],
        warnings,
        priority: 900 - (warnings.length * 50)
      })
    }
  }

  // 3. User email + amount match (medium priority - 70-80 confidence)
  if (correlationData.userEmail) {
    const user = await prisma.user.findUnique({
      where: { email: correlationData.userEmail }
    })

    if (user) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          userId: user.id,
          status: SUBSCRIPTION_STATUS.INCOMPLETE
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 3 // Limit to recent subscriptions
      })

      for (const subscription of subscriptions) {
        const expectedAmount = subscription.plan.price * 100
        const amountDiff = Math.abs(correlationData.amount - expectedAmount)
        const amountTolerance = expectedAmount * 0.02 // 2% tolerance

        if (amountDiff <= amountTolerance) {
          const confidence = amountDiff === 0 ? 80 : 70
          const priority = 700 - (subscriptions.indexOf(subscription) * 100) // Prefer newer subscriptions
          
          candidates.push({
            subscriptionId: subscription.id,
            confidence,
            matchReasons: ['user_email_amount_match'],
            warnings: amountDiff > 0 ? [`Amount difference: ${amountDiff} kobo`] : [],
            priority
          })
        }
      }
    }
  }

  // 4. Amount + currency match (lower priority - 50-60 confidence)
  if (candidates.length === 0) {
    const expectedPrice = correlationData.amount / 100 // Convert from kobo
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATUS.INCOMPLETE,
        plan: {
          price: {
            gte: expectedPrice * 0.98,
            lte: expectedPrice * 1.02
          },
          currency: correlationData.currency
        }
      },
      include: { plan: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    for (const subscription of subscriptions) {
      const exactMatch = subscription.plan.price === expectedPrice
      const confidence = exactMatch ? 60 : 50
      const priority = 500 - (subscriptions.indexOf(subscription) * 50)
      
      candidates.push({
        subscriptionId: subscription.id,
        confidence,
        matchReasons: ['amount_currency_match'],
        warnings: [
          'No user email correlation',
          `Matched by amount only: ${subscription.plan.price} ${subscription.plan.currency}`
        ],
        priority
      })
    }
  }

  // Sort by priority (highest first), then by confidence
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    return b.confidence - a.confidence
  })

  // Return best match if confidence is acceptable
  const bestMatch = candidates[0]
  if (bestMatch && bestMatch.confidence >= 70) {
    return bestMatch
  }

  // If best match has lower confidence, check for conflicts
  if (bestMatch && bestMatch.confidence >= 50) {
    const conflicts = candidates.filter(c => 
      c.subscriptionId !== bestMatch.subscriptionId && 
      c.confidence >= 50
    )

    if (conflicts.length === 0) {
      // No conflicts, accept the match but with warnings
      bestMatch.warnings.push('Low confidence match - manual review recommended')
      return bestMatch
    } else {
      // Multiple potential matches - reject to prevent wrong activation
      console.warn('Multiple subscription candidates found:', {
        reference: correlationData.reference,
        candidates: candidates.map(c => ({
          id: c.subscriptionId,
          confidence: c.confidence,
          reasons: c.matchReasons
        }))
      })
      return null
    }
  }

  return null
}

/**
 * Validate subscription match before activation
 */
export async function validateSubscriptionMatch(
  match: SubscriptionMatch,
  correlationData: PaymentCorrelationData
): Promise<{ isValid: boolean; reason?: string }> {
  // Get subscription details
  const subscription = await prisma.subscription.findUnique({
    where: { id: match.subscriptionId },
    include: { 
      plan: true, 
      user: true,
      payments: {
        where: { providerPaymentRef: correlationData.reference },
        take: 1
      }
    }
  })

  if (!subscription) {
    return { isValid: false, reason: 'Subscription not found' }
  }

  // Check if payment already processed
  if (subscription.payments.length > 0) {
    return { isValid: false, reason: 'Payment already processed for this subscription' }
  }

  // Check subscription status
  if (subscription.status !== SUBSCRIPTION_STATUS.INCOMPLETE) {
    return { isValid: false, reason: `Subscription status is ${subscription.status}, not incomplete` }
  }

  // Check for recent activations (prevent race conditions)
  const recentActivation = await prisma.subscriptionHistory.findFirst({
    where: {
      subscriptionId: subscription.id,
      action: 'activated',
      createdAt: {
        gte: new Date(Date.now() - 60000) // Last 1 minute
      }
    }
  })

  if (recentActivation) {
    return { isValid: false, reason: 'Subscription was recently activated' }
  }

  // Validate amount if high confidence match
  if (match.confidence >= 80) {
    const expectedAmount = subscription.plan.price * 100
    const amountDiff = Math.abs(correlationData.amount - expectedAmount)
    const tolerance = expectedAmount * 0.05 // 5% tolerance for high confidence

    if (amountDiff > tolerance) {
      return { 
        isValid: false, 
        reason: `Amount validation failed: expected ${expectedAmount}, got ${correlationData.amount}` 
      }
    }
  }

  return { isValid: true }
}

/**
 * Log subscription matching results for debugging
 */
export function logSubscriptionMatch(
  correlationData: PaymentCorrelationData,
  match: SubscriptionMatch | null,
  validationResult?: { isValid: boolean; reason?: string }
): void {
  const logData = {
    reference: correlationData.reference,
    userEmail: correlationData.userEmail,
    amount: correlationData.amount,
    match: match ? {
      subscriptionId: match.subscriptionId,
      confidence: match.confidence,
      reasons: match.matchReasons,
      warnings: match.warnings,
      priority: match.priority
    } : null,
    validation: validationResult
  }

  if (match && validationResult?.isValid) {
    console.log('Subscription match found and validated:', logData)
  } else if (match && !validationResult?.isValid) {
    console.warn('Subscription match found but validation failed:', logData)
  } else {
    console.error('No valid subscription match found:', logData)
  }
}