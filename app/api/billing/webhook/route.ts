import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"
import crypto from "crypto"
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS, mapPaystackPaymentStatus, mapPaystackSubscriptionStatus } from "@/lib/billing-constants"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"
import { addMonths } from "date-fns"

export const dynamic = 'force-dynamic'

const addMonthsLocal = (date: Date, months: number) => {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + months)
  return copy
}

const verifySignature = (rawBody: string, signature: string | null) => {
  if (!signature) return false
  const hash = crypto
    .createHmac("sha512", PAYSTACK_CONFIG.webhookSecret)
    .update(rawBody)
    .digest("hex")
  return hash === signature
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-paystack-signature")

    if (!verifySignature(rawBody, signature)) {
      console.error("Invalid Paystack webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const { event, data } = JSON.parse(rawBody)

    console.log(`Processing webhook event: ${event}`, {
      reference: data.reference,
      subscriptionCode: data.subscription_code || data.subscription?.subscription_code,
      status: data.status,
      metadata: data.metadata
    })

    // Handle subscription events
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
      await handleChargeSuccess(data)
    } else if (event === "charge.failed") {
      await handleChargeFailed(data)
    } else {
      console.log(`Unhandled webhook event: ${event}`)
    }

    return NextResponse.json({ status: "success" })
  } catch (error) {
    console.error("Webhook error:", error)
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
    const periodEnd = nextPaymentDate ? new Date(nextPaymentDate) : addMonthsLocal(now, 1)
    const nextBilling = nextPaymentDate ? new Date(nextPaymentDate) : addMonthsLocal(now, 1)

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

    // TODO: Send payment failure email
  }
}

async function handleInvoicePaymentSucceeded(data: any) {
  const subscriptionCode = data.subscription?.subscription_code
  const reference = data.reference
  const paymentId = data.id
  const amount = data.amount
  const currency = data.currency
  const paidAt = data.paid_at

  if (!subscriptionCode) return

  const subscription = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: subscriptionCode },
    include: { plan: true, user: true }
  })

  if (subscription) {
    const now = new Date()
    const periodEnd = addMonthsLocal(now, 1)
    const nextBilling = addMonthsLocal(now, 1)

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
  }
}

async function handleChargeSuccess(data: any) {
  const { reference, id: paymentId, amount, currency, status, metadata, authorization } = data

  if (status !== "success") {
    return
  }

  // Check if this is a subscription setup payment
  if (metadata?.type === 'subscription_setup') {
    await handleSubscriptionSetupPayment(data)
    return
  }

  // Find existing payment record by reference
  const existingPayment = await prisma.payment.findFirst({
    where: { providerPaymentRef: reference },
    include: { subscription: { include: { plan: true, user: true } } }
  })

  if (!existingPayment) {
    console.error("Payment not found for reference:", reference)
    
    // Check if this might be a subscription setup payment without proper metadata
    if (metadata?.subscription_id || metadata?.user_id) {
      console.log("Attempting to handle as subscription setup payment")
      await handleSubscriptionSetupPayment(data)
      return
    }
    
    // Try to find incomplete subscription by user email if available
    if (data.customer?.email) {
      console.log("Attempting to find incomplete subscription by user email:", data.customer.email)
      const user = await prisma.user.findUnique({
        where: { email: data.customer.email }
      })
      
      if (user) {
        const incompleteSubscription = await prisma.subscription.findFirst({
          where: {
            userId: user.id,
            status: 'incomplete'
          },
          include: { plan: true },
          orderBy: { createdAt: 'desc' }
        })
        
        if (incompleteSubscription) {
          console.log("Found incomplete subscription, activating:", incompleteSubscription.id)
          await activateSubscriptionFromPayment(incompleteSubscription, data)
          return
        }
      }
    }
    
    console.error("Could not handle charge success - no matching payment or subscription found")
    return
  }

  if (existingPayment.status === PAYMENT_STATUS.SUCCEEDED) {
    console.log("Duplicate webhook for payment:", reference)
    return // Duplicate webhook
  }

  const subscription = existingPayment.subscription
  const now = new Date()
  const periodEnd = subscription ? addMonthsLocal(now, 1) : null

  await prisma.$transaction(async (tx) => {
    // Update payment
    await tx.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: PAYMENT_STATUS.SUCCEEDED,
        providerPaymentId: paymentId.toString(),
        amount: (amount || 0) / 100,
        currency: currency || existingPayment.currency,
        description: existingPayment.description ?? `Payment for ${subscription?.plan?.name ?? "plan"}`,
        ...(authorization?.authorization_code && { authorizationCode: authorization.authorization_code })
      }
    })

    // Update subscription if exists and ensure it's activated
    if (subscription && periodEnd) {
      const updateData: any = {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        providerSubscriptionId: data.subscription?.subscription_code ?? subscription.providerSubscriptionId,
        providerCustomerId: data.customer?.id?.toString() || subscription.providerCustomerId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        retryCount: 0, // Reset retry count on successful payment
        gracePeriodEnd: null, // Clear grace period
        lastPaymentAttempt: now,
      }

      await tx.subscription.update({
        where: { id: subscription.id },
        data: updateData
      })

      // Create subscription history entry
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: subscription.status === 'incomplete' ? 'activated' : 'renewed',
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
          reason: subscription.status === 'incomplete' ? 'Initial payment succeeded' : 'Payment succeeded',
        }
      })
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
  }
}

async function handleSubscriptionSetupPayment(data: any) {
  const { reference, id: paymentId, amount, currency, status, metadata, authorization } = data

  if (status !== "success") {
    console.log("Subscription setup payment not successful:", status)
    return
  }

  const subscriptionId = metadata?.subscription_id
  const userId = metadata?.user_id
  const planId = metadata?.plan_id

  if (!subscriptionId || !userId || !planId) {
    console.error("Missing metadata for subscription setup payment:", metadata)
    return
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, user: true }
  })

  if (!subscription) {
    console.error("Subscription not found for setup payment:", subscriptionId)
    return
  }

  if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
    console.log("Subscription already active, skipping setup:", subscriptionId)
    return
  }

  const now = new Date()
  const periodEnd = addMonthsLocal(now, 1)

  await prisma.$transaction(async (tx) => {
    // Check if payment record already exists
    const existingPayment = await tx.payment.findFirst({
      where: { providerPaymentRef: reference }
    })

    if (!existingPayment) {
      // Create payment record
      await tx.payment.create({
        data: {
          subscriptionId: subscription.id,
          userId: subscription.userId,
          amount: (amount || 0) / 100,
          currency: currency || subscription.plan.currency,
          status: PAYMENT_STATUS.SUCCEEDED,
          providerPaymentId: paymentId.toString(),
          providerPaymentRef: reference,
          description: `Initial payment for ${subscription.plan.name}`,
          ...(authorization?.authorization_code && { authorizationCode: authorization.authorization_code }),
        }
      })
    } else {
      // Update existing payment
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PAYMENT_STATUS.SUCCEEDED,
          providerPaymentId: paymentId.toString(),
          ...(authorization?.authorization_code && { authorizationCode: authorization.authorization_code }),
        }
      })
    }

    // Now create the Paystack subscription with the authorization
    if (authorization?.authorization_code) {
      try {
        const { createPaystackSubscription, getOrCreatePaystackPlan } = await import('@/lib/paystack-subscription')
        const { getPaystackCurrency, convertToPaystackSubunit } = await import('@/lib/paystack-currency')
        
        const paystackCurrency = getPaystackCurrency(subscription.plan.currency)
        const paystackPlan = await getOrCreatePaystackPlan({
          name: subscription.plan.name,
          amount: convertToPaystackSubunit(subscription.plan.price, paystackCurrency),
          interval: "monthly",
          currency: paystackCurrency,
          description: subscription.plan.description || undefined,
        })

        const paystackSubscription = await createPaystackSubscription({
          customer: subscription.providerCustomerId!,
          plan: paystackPlan.plan_code,
          authorization: authorization.authorization_code,
        })

        // Update subscription with Paystack subscription ID and activate it
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SUBSCRIPTION_STATUS.ACTIVE,
            providerSubscriptionId: paystackSubscription.subscription_code,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
            cancelAtPeriodEnd: false,
            retryCount: 0,
            gracePeriodEnd: null,
            lastPaymentAttempt: now,
          }
        })

        // Create subscription history entry
        await tx.subscriptionHistory.create({
          data: {
            subscriptionId: subscription.id,
            action: "activated",
            oldValue: JSON.stringify({ status: subscription.status }),
            newValue: JSON.stringify({
              status: SUBSCRIPTION_STATUS.ACTIVE,
              providerSubscriptionId: paystackSubscription.subscription_code,
            }),
            reason: "Subscription activated after initial payment",
          }
        })

        console.log("Subscription successfully activated:", subscriptionId)

      } catch (error) {
        console.error("Error creating Paystack subscription after payment:", error)
        // Still update subscription to active since payment succeeded
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
            cancelAtPeriodEnd: false,
            retryCount: 0,
            gracePeriodEnd: null,
            lastPaymentAttempt: now,
          }
        })

        // Create subscription history entry
        await tx.subscriptionHistory.create({
          data: {
            subscriptionId: subscription.id,
            action: "activated",
            oldValue: JSON.stringify({ status: subscription.status }),
            newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
            reason: "Subscription activated after initial payment (Paystack subscription creation failed)",
          }
        })

        console.log("Subscription activated without Paystack subscription:", subscriptionId)
      }
    } else {
      // No authorization code, but payment succeeded - still activate subscription
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
          cancelAtPeriodEnd: false,
          retryCount: 0,
          gracePeriodEnd: null,
          lastPaymentAttempt: now,
        }
      })

      // Create subscription history entry
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: "activated",
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({ status: SUBSCRIPTION_STATUS.ACTIVE }),
          reason: "Subscription activated after initial payment (no authorization code)",
        }
      })

      console.log("Subscription activated without authorization code:", subscriptionId)
    }
  })

  await createAuditLog({
    userId: subscription.userId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
    resource: "subscription",
    resourceId: subscription.id,
    details: { 
      action: "subscription_setup_completed", 
      reference,
      authorizationCode: authorization?.authorization_code,
      previousStatus: subscription.status
    }
  })
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
// Helper function to activate subscription from payment data
async function activateSubscriptionFromPayment(subscription: any, paymentData: any) {
  const { reference, id: paymentId, amount, currency, authorization } = paymentData
  const now = new Date()
  const periodEnd = addMonthsLocal(now, 1)

  await prisma.$transaction(async (tx) => {
    // Create payment record
    await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        amount: (amount || 0) / 100,
        currency: currency || subscription.plan.currency,
        status: PAYMENT_STATUS.SUCCEEDED,
        providerPaymentId: paymentId.toString(),
        providerPaymentRef: reference,
        description: `Initial payment for ${subscription.plan.name}`,
        ...(authorization?.authorization_code && { authorizationCode: authorization.authorization_code }),
      }
    })

    // Try to create Paystack subscription with authorization if available
    let providerSubscriptionId = subscription.providerSubscriptionId
    
    if (authorization?.authorization_code && !providerSubscriptionId) {
      try {
        const { createPaystackSubscription, getOrCreatePaystackPlan } = await import('@/lib/paystack-subscription')
        const { getPaystackCurrency, convertToPaystackSubunit } = await import('@/lib/paystack-currency')
        
        const paystackCurrency = getPaystackCurrency(subscription.plan.currency)
        const paystackPlan = await getOrCreatePaystackPlan({
          name: subscription.plan.name,
          amount: convertToPaystackSubunit(subscription.plan.price, paystackCurrency),
          interval: "monthly",
          currency: paystackCurrency,
          description: subscription.plan.description || undefined,
        })

        const paystackSubscription = await createPaystackSubscription({
          customer: subscription.providerCustomerId!,
          plan: paystackPlan.plan_code,
          authorization: authorization.authorization_code,
        })

        providerSubscriptionId = paystackSubscription.subscription_code
        console.log("Created Paystack subscription:", providerSubscriptionId)
      } catch (error) {
        console.error("Failed to create Paystack subscription:", error)
        // Continue with activation even if Paystack subscription creation fails
      }
    }

    // Update subscription to active
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        ...(providerSubscriptionId && { providerSubscriptionId }),
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        cancelAtPeriodEnd: false,
        retryCount: 0,
        gracePeriodEnd: null,
        lastPaymentAttempt: now,
      }
    })

    // Create subscription history entry
    await tx.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: "activated",
        oldValue: JSON.stringify({ status: subscription.status }),
        newValue: JSON.stringify({
          status: SUBSCRIPTION_STATUS.ACTIVE,
          ...(providerSubscriptionId && { providerSubscriptionId }),
        }),
        reason: "Subscription activated from successful payment",
      }
    })
  })

  // Create audit log
  await createAuditLog({
    userId: subscription.userId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
    resource: "subscription",
    resourceId: subscription.id,
    details: { 
      action: "activated_from_payment", 
      reference,
      previousStatus: subscription.status 
    }
  })

  console.log("Successfully activated subscription:", subscription.id)
}