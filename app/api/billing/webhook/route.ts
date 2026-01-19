import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"
import crypto from "crypto"
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS, mapPaystackPaymentStatus, mapPaystackSubscriptionStatus } from "@/lib/billing-constants"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"
import { addMonths } from "date-fns"
import { activateSubscription } from "@/lib/subscription-manager"
import redis from "@/lib/redis"
import { 
  withWebhookRetry, 
  retrySubscriptionActivation, 
  isRetryableWebhookError,
  logWebhookAttempt 
} from "@/lib/enhanced-webhook-retry"
import {
  sendPaymentFailedSafe,
  sendSubscriptionRenewedSafe,
  sendSubscriptionCancelledSafe
} from "@/lib/email-templates"
import {
  validateWebhookSignature,
  validateChargeData,
  validateSubscriptionData,
  validateInvoiceData,
  extractSubscriptionCorrelation,
  shouldProcessWebhookEvent,
  logWebhookValidation
} from "@/lib/webhook-validation"
import {
  verifySubscriptionLinking,
  findBestSubscriptionMatch,
  logLinkingVerification
} from "@/lib/subscription-linking-verification"
import {
  validatePaymentAmount,
  logAmountValidation
} from "@/lib/payment-amount-validation"
import {
  findBestSubscriptionMatchEnhanced,
  validateSubscriptionMatch,
  logSubscriptionMatch
} from "@/lib/enhanced-subscription-matching"

export const dynamic = 'force-dynamic'

// In-memory processed events cache (for single instance)
const processedEvents = new Set<string>()

// Clean up old events every hour
setInterval(() => {
  if (processedEvents.size > 1000) {
    processedEvents.clear()
    console.log('Cleared processed events cache')
  }
}, 3600000)

const verifySignature = (rawBody: string, signature: string | null) => {
  const result = validateWebhookSignature(rawBody, signature, PAYSTACK_CONFIG.webhookSecret)
  return result.isValid
}

/**
 * Safely parse metadata that might be a string or already an object
 */
const parseMetadata = (metadata: any) => {
  if (!metadata) return {}
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata)
    } catch {
      return {}
    }
  }
  return metadata
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-paystack-signature")

    // Enhanced signature validation
    const signatureValidation = validateWebhookSignature(rawBody, signature, PAYSTACK_CONFIG.webhookSecret)
    if (!signatureValidation.isValid) {
      console.error("Invalid Paystack webhook signature:", signatureValidation.error)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
    
    console.log("✅ Webhook signature validated successfully")

    const { event, data } = JSON.parse(rawBody)

    // Check for duplicate events
    if (!shouldProcessWebhookEvent(event, data.reference || data.subscription_code || 'unknown', processedEvents)) {
      return NextResponse.json({ status: "duplicate_ignored" })
    }

    console.log(`Processing webhook event: ${event}`, {
      reference: data.reference,
      subscriptionCode: data.subscription_code || data.subscription?.subscription_code,
      status: data.status,
      metadata: data.metadata
    })

    // Process with retry logic
    await withWebhookRetry(async () => {
      if (event === "subscription.create") {
        await handleSubscriptionCreate(data)
      } else if (event === "subscription.enable") {
        await handleSubscriptionEnable(data)
      } else if (event === "subscription.disable") {
        await handleSubscriptionDisable(data)
      } else if (event === "subscription.not_renew") {
        await handleSubscriptionNotRenew(data)
      } else if (event === "invoice.payment_failed") {
        await handleInvoicePaymentFailed(data)
      } else if (event === "invoice.payment_succeeded") {
        await handleInvoicePaymentSucceeded(data)
      } else if (event === "charge.success") {
        await handleChargeSuccessEnhanced(data)
      } else if (event === "charge.failed") {
        await handleChargeFailed(data)
      } else {
        console.log(`Unhandled webhook event: ${event}`)
      }
    }, { maxAttempts: 3 }, `webhook_${event}_${data.reference || 'unknown'}`)

    return NextResponse.json({ status: "success" })
  } catch (error) {
    console.error("Webhook processing error:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    // Check if this is a retryable error
    if (isRetryableWebhookError(error)) {
      return NextResponse.json(
        { error: "Temporary failure, please retry" },
        { status: 503 } // Service Unavailable - indicates retry
      )
    }
    
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// Webhook event handlers

async function handleSubscriptionCreate(data: any) {
  const subscriptionCode = data.subscription_code
  const customerCode = data.customer?.customer_code
  const planCode = data.plan?.plan_code

  if (!subscriptionCode) {
    console.error("Missing subscription_code in subscription.create event")
    return
  }

  // Find subscription by providerSubscriptionId
  const subscription = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: subscriptionCode },
    include: { plan: true, user: true }
  })

  if (subscription) {
    // Update subscription with customer code if missing
    if (!subscription.providerCustomerId && customerCode) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { providerCustomerId: customerCode }
      })
    }

    // Create subscription history
    await prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: "plan_changed",
        newValue: JSON.stringify({
          providerSubscriptionId: subscriptionCode,
          status: "incomplete",
        }),
        reason: "Subscription created in Paystack",
      }
    })
  }
}

async function handleSubscriptionEnable(data: any) {
  const subscriptionCode = data.subscription_code
  const nextPaymentDate = data.next_payment_date

  if (!subscriptionCode) return

  const subscription = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: subscriptionCode },
    include: { plan: true, user: true }
  })

  if (subscription) {
    const now = new Date()
    const periodEnd = nextPaymentDate ? new Date(nextPaymentDate) : addMonths(now, 1)
    const nextBilling = nextPaymentDate ? new Date(nextPaymentDate) : addMonths(now, 1)

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: nextBilling,
          cancelAtPeriodEnd: false,
        }
      })

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: "reactivated",
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
          reason: "Subscription enabled in Paystack",
        }
      })
    })

    await createAuditLog({
      userId: subscription.userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
      resource: "subscription",
      resourceId: subscription.id,
      details: { action: "enabled", status: SUBSCRIPTION_STATUS.ACTIVE }
    })
  }
}

async function handleSubscriptionDisable(data: any) {
  const subscriptionCode = data.subscription_code

  if (!subscriptionCode) return

  const subscription = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: subscriptionCode },
    include: { plan: true, user: true }
  })

  if (subscription) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.CANCELED,
          cancelAtPeriodEnd: true,
        }
      })

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: "cancelled",
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.CANCELED }),
          reason: "Subscription disabled in Paystack",
        }
      })
    })

    await createAuditLog({
      userId: subscription.userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
      resource: "subscription",
      resourceId: subscription.id,
      details: { reason: "Disabled via Paystack" }
    })

    // Send cancellation email (async, don't block webhook response)
    if (subscription.user.email) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      sendSubscriptionCancelledSafe(
        subscription.user.email,
        subscription.plan.name,
        new Date(),
        `${baseUrl}/dashboard/billing`,
        subscription.user.name || undefined,
        subscription.currentPeriodEnd || undefined,
        "Subscription disabled via payment provider",
        `${baseUrl}/dashboard/billing`
      ).catch((err) => {
        console.error(`Failed to send subscription cancelled email:`, err)
      })
    }
  }
}

async function handleSubscriptionNotRenew(data: any) {
  const subscriptionCode = data.subscription_code

  if (!subscriptionCode) return

  const subscription = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: subscriptionCode }
  })

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      }
    })
  }
}

async function handleInvoicePaymentFailed(data: any) {
  const subscriptionCode = data.subscription?.subscription_code
  const reference = data.reference
  const amount = data.amount
  const currency = data.currency

  if (!subscriptionCode) return

  const subscription = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: subscriptionCode },
    include: { plan: true, user: true }
  })

  if (subscription) {
    const GRACE_PERIOD_DAYS = 7
    const now = new Date()
    const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    const retryCount = (subscription.retryCount || 0) + 1

    await prisma.$transaction(async (tx) => {
      // Update subscription status
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.PAST_DUE,
          gracePeriodEnd: subscription.gracePeriodEnd || gracePeriodEnd,
          retryCount: retryCount,
          lastPaymentAttempt: now,
        }
      })

      // Create failed payment record
      await tx.payment.create({
        data: {
          subscriptionId: subscription.id,
          userId: subscription.userId,
          amount: (amount || 0) / 100,
          currency: currency || subscription.plan.currency,
          status: PAYMENT_STATUS.FAILED,
          description: `Failed invoice payment for ${subscription.plan.name} plan`,
          providerPaymentRef: reference || `failed_invoice_${subscription.id}_${Date.now()}`,
        }
      })

      // Create subscription history
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: subscription.gracePeriodEnd ? "status_changed" : "grace_period_started",
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({
            status: SUBSCRIPTION_STATUS.PAST_DUE,
            gracePeriodEnd: gracePeriodEnd,
            retryCount: retryCount
          }),
          reason: "Invoice payment failed",
        }
      })
    })

    // Send payment failed email (async, don't block webhook response)
    if (subscription.user.email) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      sendPaymentFailedSafe(
        subscription.user.email,
        subscription.plan.name,
        (amount || 0) / 100,
        currency || subscription.plan.currency,
        new Date(),
        `${baseUrl}/dashboard/billing`,
        `${baseUrl}/dashboard/billing`,
        subscription.user.name || undefined,
        undefined, // retryDate - could be calculated based on retry logic
        gracePeriodEnd,
        "Payment processing failed"
      ).catch((err) => {
        console.error(`Failed to send payment failed email:`, err)
      })
    }

    // TODO: Send payment failure email
  }
}

async function handleInvoicePaymentSucceeded(data: any) {
  const subscriptionCode = data.subscription?.subscription_code
  const reference = data.reference
  const paymentId = data.id
  const amount = data.amount
  const currency = data.currency
  const customerEmail = data.customer?.email
  const authorization = data.authorization || data.subscription?.authorization

  if (!subscriptionCode) return

  let subscription = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: subscriptionCode },
    include: { plan: true, user: true }
  })

  // FALLBACK: If subscription not found by code, try to find by customer email
  if (!subscription && customerEmail) {
    console.log(`Subscription not found by code ${subscriptionCode}, searching by email: ${customerEmail}`)
    const user = await prisma.user.findUnique({
      where: { email: customerEmail }
    })

    if (user) {
      subscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: { in: [SUBSCRIPTION_STATUS.INCOMPLETE, SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.PAST_DUE] }
        },
        include: { plan: true, user: true },
        orderBy: { createdAt: 'desc' }
      })

      if (subscription && !subscription.providerSubscriptionId) {
        console.log(`Found subscription ${subscription.id} for user, linking Paystack code: ${subscriptionCode}`)
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { providerSubscriptionId: subscriptionCode }
        })
      }
    }
  }

  if (subscription) {
    // If the subscription is incomplete, use the centralized activation logic
    if (subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
      console.log(`Activating incomplete subscription ${subscription.id} via invoice webhook`)
      await activateSubscription({
        subscriptionId: subscription.id,
        paymentData: {
          reference,
          paymentId: paymentId?.toString(),
          amount: amount || 0,
          currency: currency || subscription.plan.currency,
          authorization
        },
        source: 'webhook'
      })
      return
    }

    const now = new Date()
    const periodEnd = addMonths(now, 1)
    const nextBilling = addMonths(now, 1)

    await prisma.$transaction(async (tx) => {
      // Update subscription
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: nextBilling,
          cancelAtPeriodEnd: false,
          retryCount: 0,
          gracePeriodEnd: null,
          lastPaymentAttempt: now,
        }
      })

      // Check if payment already exists
      const existingPayment = await tx.payment.findFirst({
        where: { providerPaymentRef: reference }
      })

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            amount: (amount || 0) / 100,
            currency: currency || subscription.plan.currency,
            status: PAYMENT_STATUS.SUCCEEDED,
            description: `Invoice payment for ${subscription.plan.name} plan`,
            providerPaymentId: paymentId?.toString(),
            providerPaymentRef: reference || `invoice_${subscription.id}_${Date.now()}`,
          }
        })
      } else {
        // Update existing payment
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: PAYMENT_STATUS.SUCCEEDED,
            providerPaymentId: paymentId?.toString(),
          }
        })
      }

      // Create subscription history
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: "renewed",
          newValue: JSON.stringify({
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: nextBilling,
          }),
          reason: "Invoice payment succeeded",
        }
      })
    })

    await createAuditLog({
      userId: subscription.userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
      resource: "subscription",
      resourceId: subscription.id,
      details: { action: "renewed", paymentReference: reference }
    })

    // Send subscription renewed email (async, don't block webhook response)
    if (subscription.user.email) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      sendSubscriptionRenewedSafe(
        subscription.user.email,
        subscription.plan.name,
        (amount || 0) / 100,
        currency || subscription.plan.currency,
        new Date(),
        nextBilling,
        now,
        periodEnd,
        `${baseUrl}/dashboard/billing`,
        subscription.user.name || undefined
      ).catch((err) => {
        console.error(`Failed to send subscription renewed email:`, err)
      })
    }
  }
}

/**
 * Enhanced charge.success handler with validation and verification
 */
async function handleChargeSuccessEnhanced(data: any) {
  // Validate webhook data
  const validation = validateChargeData(data)
  logWebhookValidation('charge.success', data.reference || 'unknown', validation)
  
  if (!validation.isValid) {
    console.error('Invalid charge.success data:', validation.errors)
    throw new Error(`Invalid webhook data: ${validation.errors?.join(', ')}`)
  }

  const validatedData = validation.data!
  const correlationData = extractSubscriptionCorrelation(validatedData)

  console.log('Processing charge.success with correlation data:', {
    reference: correlationData.reference,
    subscriptionId: correlationData.subscriptionId,
    userEmail: correlationData.userEmail,
    amount: correlationData.amount
  })

  // Try to find existing payment first
  let existingPayment = await prisma.payment.findFirst({
    where: { providerPaymentRef: correlationData.reference },
    include: { subscription: { include: { plan: true, user: true } } }
  })

  if (existingPayment?.subscription) {
    // Verify the linking is correct
    const verification = await verifySubscriptionLinking(
      existingPayment.subscription.id,
      {
        reference: correlationData.reference,
        amount: correlationData.amount,
        currency: correlationData.currency,
        userEmail: correlationData.userEmail,
        metadata: validatedData.metadata
      }
    )

    logLinkingVerification(correlationData.reference, existingPayment.subscription.id, verification)

    if (verification.suggestedAction === 'reject') {
      console.error(`Rejecting payment linking: ${verification.reason}`)
      throw new Error(`Payment linking rejected: ${verification.reason}`)
    }

    if (verification.suggestedAction === 'manual_review') {
      console.warn(`Payment linking requires manual review: ${verification.reason}`)
      // Continue processing but log for manual review
    }

    // Proceed with activation
    if (existingPayment.subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
      const result = await retrySubscriptionActivation(
        existingPayment.subscription.id,
        {
          reference: correlationData.reference,
          paymentId: correlationData.paymentId,
          amount: correlationData.amount,
          currency: correlationData.currency,
          authorization: correlationData.authorization
        },
        'webhook'
      )

      if (result.result.success) {
        console.log(`Subscription activated successfully: ${existingPayment.subscription.id}`)
      } else {
        console.error(`Failed to activate subscription: ${result.result.reason}`)
      }
    }
    return
  }

  // No existing payment found, use enhanced subscription matching
  console.log('No existing payment found, using enhanced subscription matching...')
  
  const match = await findBestSubscriptionMatchEnhanced({
    reference: correlationData.reference,
    amount: correlationData.amount,
    currency: correlationData.currency,
    userEmail: correlationData.userEmail,
    metadata: validatedData.metadata,
    paymentId: correlationData.paymentId
  })

  logSubscriptionMatch({
    reference: correlationData.reference,
    amount: correlationData.amount,
    currency: correlationData.currency,
    userEmail: correlationData.userEmail,
    metadata: validatedData.metadata,
    paymentId: correlationData.paymentId
  }, match)

  if (!match) {
    console.error('No valid subscription match found for charge.success:', {
      reference: correlationData.reference,
      userEmail: correlationData.userEmail,
      amount: correlationData.amount
    })
    
    // Log for manual investigation
    await createAuditLog({
      userId: correlationData.userId || 'system',
      action: AUDIT_ACTIONS.PAYMENT_ORPHANED,
      resource: 'payment',
      resourceId: correlationData.reference,
      details: {
        reference: correlationData.reference,
        amount: correlationData.amount,
        userEmail: correlationData.userEmail,
        reason: 'No subscription match found with enhanced matching'
      }
    })
    
    throw new Error('No valid subscription found for payment')
  }

  // Validate the match before proceeding
  const matchValidation = await validateSubscriptionMatch(match, {
    reference: correlationData.reference,
    amount: correlationData.amount,
    currency: correlationData.currency,
    userEmail: correlationData.userEmail,
    metadata: validatedData.metadata,
    paymentId: correlationData.paymentId
  })

  logSubscriptionMatch({
    reference: correlationData.reference,
    amount: correlationData.amount,
    currency: correlationData.currency,
    userEmail: correlationData.userEmail,
    metadata: validatedData.metadata,
    paymentId: correlationData.paymentId
  }, match, matchValidation)

  if (!matchValidation.isValid) {
    console.error(`Subscription match validation failed: ${matchValidation.reason}`)
    throw new Error(`Subscription match validation failed: ${matchValidation.reason}`)
  }

  // Log warnings if any
  if (match.warnings.length > 0) {
    console.warn(`Subscription match has warnings:`, match.warnings)
  }

  // Validate payment amount before activation
  const amountValidation = await validatePaymentAmount(
    match.subscriptionId,
    correlationData.amount,
    correlationData.currency
  )

  await logAmountValidation(
    match.subscriptionId,
    correlationData.reference,
    amountValidation,
    correlationData.userId
  )

  if (amountValidation.suggestedAction === 'reject') {
    console.error(`Rejecting payment due to amount validation: ${amountValidation.reason}`)
    throw new Error(`Payment amount validation failed: ${amountValidation.reason}`)
  }

  if (amountValidation.suggestedAction === 'review') {
    console.warn(`Payment amount requires review: ${amountValidation.reason}`)
    // Continue processing but flag for review
  }

  // Activate the matched subscription
  const result = await retrySubscriptionActivation(
    match.subscriptionId,
    {
      reference: correlationData.reference,
      paymentId: correlationData.paymentId,
      amount: correlationData.amount,
      currency: correlationData.currency,
      authorization: correlationData.authorization
    },
    'webhook'
  )

  if (result.result.success) {
    console.log(`Subscription activated successfully via enhanced matching: ${match.subscriptionId} (confidence: ${match.confidence}%)`)
  } else {
    console.error(`Failed to activate matched subscription: ${result.result.reason}`)
    throw new Error(`Activation failed: ${result.result.reason}`)
  }
}

/**
 * Original charge.success handler (fallback - kept for reference but not used)
 */
async function handleChargeSuccessOriginal(data: any) {
  const { reference, id: paymentId, amount, currency, status, authorization } = data
  const metadata = parseMetadata(data.metadata)

  if (status !== "success") {
    return
  }

  console.log("Processing charge.success webhook:", {
    reference,
    paymentId,
    amount,
    currency,
    metadata
  })

  // First: try deterministic redis mapping by reference
  try {
    const refMap = await redis.get(`paystack:ref:${reference}`)
    if (refMap) {
      const parsed = JSON.parse(refMap)
      if (parsed?.subscriptionId) {
        const result = await activateSubscription({
          subscriptionId: parsed.subscriptionId,
          paymentData: {
            reference,
            paymentId: paymentId?.toString(),
            amount: amount || 0,
            currency: currency || 'NGN',
            authorization
          },
          source: 'webhook'
        })
        if (result.result?.success) {
          console.log("Webhook: charge.success resolved via redis mapping", { reference, subscriptionId: parsed.subscriptionId })
          return
        } else if (result.result?.reason === 'lock_timeout') {
          // retry once after short delay
          await new Promise(r => setTimeout(r, 250))
          const retry = await activateSubscription({
            subscriptionId: parsed.subscriptionId,
            paymentData: {
              reference,
              paymentId: paymentId?.toString(),
              amount: amount || 0,
              currency: currency || 'NGN',
              authorization
            },
            source: 'webhook'
          })
          if (retry.result?.success) {
            console.log("Webhook: charge.success resolved via redis mapping after retry", { reference, subscriptionId: parsed.subscriptionId })
            return
          }
        }
      }
    }
  } catch (e) {
    console.warn("Webhook: redis mapping lookup failed", { reference })
  }

  // Check if this is a subscription setup payment
  if (metadata?.type === 'subscription_setup' && metadata?.subscription_id) {
    console.log("Processing subscription setup payment:", metadata.subscription_id)

    const result = await activateSubscription({
      subscriptionId: metadata.subscription_id,
      paymentData: {
        reference,
        paymentId: paymentId?.toString(),
        amount: amount || 0,
        currency: currency || 'NGN',
        authorization
      },
      source: 'webhook'
    })

    if (result.result.success) {
      console.log("Subscription activated successfully:", metadata.subscription_id)
    } else {
      console.error("Failed to activate subscription:", result.result.reason)
    }
    return
  }

  // Find existing payment record by reference
  let existingPayment = await prisma.payment.findFirst({
    where: { providerPaymentRef: reference },
    include: { subscription: { include: { plan: true, user: true } } }
  })

  // If payment not found, try alternative approaches
  if (!existingPayment) {
    console.log("Payment not found by reference, trying alternative approaches...")

    // Approach 1: Check if this might be a subscription setup payment with metadata
    if (metadata?.subscription_id) {
      console.log("Found subscription_id in metadata:", metadata.subscription_id)

      const subscription = await prisma.subscription.findUnique({
        where: { id: metadata.subscription_id },
        include: { plan: true, user: true }
      })

      if (subscription && subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
        console.log("Found incomplete subscription, activating:", subscription.id)

        const result = await activateSubscription({
          subscriptionId: subscription.id,
          paymentData: {
            reference,
            paymentId: paymentId?.toString(),
            amount: amount || 0,
            currency: currency || subscription.plan.currency,
            authorization
          },
          source: 'webhook'
        })

        if (result.result.success) {
          console.log("Subscription activated successfully:", subscription.id)
        } else {
          console.error("Failed to activate subscription:", result.result.reason)
        }
        return
      }
    }

    // Approach 2: Try to find incomplete subscription by user email
    if (data.customer?.email) {
      console.log("Attempting to find incomplete subscription by user email:", data.customer.email)

      const user = await prisma.user.findUnique({
        where: { email: data.customer.email }
      })

      if (user) {
        const incompleteSubscription = await prisma.subscription.findFirst({
          where: {
            userId: user.id,
            status: SUBSCRIPTION_STATUS.INCOMPLETE
          },
          include: { plan: true, user: true },
          orderBy: { createdAt: 'desc' } // Get the most recent one
        })

        if (incompleteSubscription) {
          console.log("Found incomplete subscription by email, activating:", incompleteSubscription.id)

          const result = await activateSubscription({
            subscriptionId: incompleteSubscription.id,
            paymentData: {
              reference,
              paymentId: paymentId?.toString(),
              amount: amount || 0,
              currency: currency || incompleteSubscription.plan.currency,
              authorization
            },
            source: 'webhook'
          })

          if (result.result.success) {
            console.log("Subscription activated successfully:", incompleteSubscription.id)
          } else {
            console.error("Failed to activate subscription:", result.result.reason)
          }
          return
        }
      }
    }

    // Approach 3: Try to find by payment amount and user (if we have user info)
    if (data.customer?.email && amount) {
      const user = await prisma.user.findUnique({
        where: { email: data.customer.email }
      })

      if (user) {
        const matchingSubscription = await prisma.subscription.findFirst({
          where: {
            userId: user.id,
            status: SUBSCRIPTION_STATUS.INCOMPLETE,
            plan: {
              // Convert amount from kobo to naira for comparison
              price: (amount || 0) / 100
            }
          },
          include: { plan: true, user: true },
          orderBy: { createdAt: 'desc' }
        })

        if (matchingSubscription) {
          console.log("Found incomplete subscription by amount match, activating:", matchingSubscription.id)

          const result = await activateSubscription({
            subscriptionId: matchingSubscription.id,
            paymentData: {
              reference,
              paymentId: paymentId?.toString(),
              amount: amount || 0,
              currency: currency || matchingSubscription.plan.currency,
              authorization
            },
            source: 'webhook'
          })

          if (result.result.success) {
            console.log("Subscription activated successfully:", matchingSubscription.id)
          } else {
            console.error("Failed to activate subscription:", result.result.reason)
          }
          return
        }
      }
    }

    // Approach 4: Try to find any PENDING payment matching this user and amount
    // This handles upgrade proration payments where the reference might not match
    if (data.customer?.email && amount) {
      const user = await prisma.user.findUnique({
        where: { email: data.customer.email }
      })

      if (user) {
        const pendingPayment = await prisma.payment.findFirst({
          where: {
            userId: user.id,
            status: PAYMENT_STATUS.PENDING,
            amount: (amount || 0) / 100,
          },
          include: { subscription: { include: { plan: true, user: true } } }
        })

        if (pendingPayment) {
          console.log("Found pending payment by amount match from customer email, updating:", pendingPayment.id)
          existingPayment = pendingPayment as any
        }
      }
    }

    if (!existingPayment) {
      console.error("Could not handle charge success - no matching payment or subscription found", {
        reference,
        customerEmail: data.customer?.email,
        metadata,
        amount
      })
      return
    }
  }

  // Handle existing payment - use centralized activation for incomplete subscriptions
  if (existingPayment.subscription && existingPayment.subscription.status === SUBSCRIPTION_STATUS.INCOMPLETE) {
    const result = await activateSubscription({
      subscriptionId: existingPayment.subscription.id,
      paymentData: {
        reference,
        paymentId: paymentId?.toString(),
        amount: amount || 0,
        currency: currency || existingPayment.currency,
        authorization
      },
      source: 'webhook'
    })

    if (result.result.success) {
      console.log("Subscription activated successfully:", existingPayment.subscription.id)
    } else {
      console.error("Failed to activate subscription:", result.result.reason)
    }
    return
  }

  // Handle duplicate webhook
  if (existingPayment.status === PAYMENT_STATUS.SUCCEEDED) {
    console.log("Duplicate webhook for payment:", reference)
    return
  }

  // Handle regular payment update for active subscriptions
  const subscription = existingPayment.subscription
  const now = new Date()
  const periodEnd = subscription ? addMonths(now, 1) : null

  await prisma.$transaction(async (tx) => {
    // Update payment
    await tx.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: PAYMENT_STATUS.SUCCEEDED,
        providerPaymentId: paymentId?.toString(),
        amount: (amount || 0) / 100,
        currency: currency || existingPayment.currency,
        description: existingPayment.description ?? `Payment for ${subscription?.plan?.name ?? "plan"}`,
        ...(authorization?.authorization_code && { authorizationCode: authorization.authorization_code })
      }
    })

    // Update subscription if exists and it's a renewal
    if (subscription && periodEnd && subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
          retryCount: 0,
          gracePeriodEnd: null,
          lastPaymentAttempt: now,
        }
      })

      // Create subscription history entry
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: 'renewed',
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
          reason: 'Payment succeeded - subscription renewed',
        }
      })

      console.log(`Subscription ${subscription.id} renewed via webhook`)
    }
  })

  if (subscription) {
    await createAuditLog({
      userId: subscription.userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
      resource: "subscription",
      resourceId: subscription.id,
      details: { action: "payment_succeeded", reference, previousStatus: subscription.status }
    })

    // Send subscription renewed email for regular renewals (async, don't block webhook response)
    if (subscription.user?.email && periodEnd) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      sendSubscriptionRenewedSafe(
        subscription.user.email,
        subscription.plan?.name || "Premium",
        (amount || 0) / 100,
        currency || subscription.plan?.currency || "USD",
        new Date(),
        periodEnd,
        now,
        periodEnd,
        `${baseUrl}/dashboard/billing`,
        subscription.user.name || undefined
      ).catch((err) => {
        console.error(`Failed to send subscription renewed email:`, err)
      })
    }
  }
}

async function handleChargeFailed(data: any) {
  const { reference } = data

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentRef: reference },
    include: { subscription: true }
  })

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PAYMENT_STATUS.FAILED }
    })

    // Update subscription if it exists
    if (payment.subscription) {
      await prisma.subscription.update({
        where: { id: payment.subscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.PAST_DUE,
          lastPaymentAttempt: new Date(),
        }
      })
    }
  }
}