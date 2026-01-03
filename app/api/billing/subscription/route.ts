import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"
import prisma from "@/lib/prisma"
import {
  getOrCreatePaystackCustomer,
  getOrCreatePaystackPlan,
  createPaystackSubscription,
} from "@/lib/paystack-subscription"
import { PAYSTACK_CONFIG as CONFIG } from "@/lib/paystack-config"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"
import { BILLING_INTERVAL, PAYMENT_STATUS } from "@/lib/billing-constants"

export const dynamic = 'force-dynamic'

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + months)
  return copy
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }


    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["active", "past_due", "incomplete"] }
      },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    })

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }


    const { planId } = await request.json()

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 })
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["active", "past_due"] }
      }
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: "User already has an active subscription" },
        { status: 400 }
      )
    }

    // Get the plan
    const plan = await prisma.billingPlan.findUnique({
      where: { id: planId }
    })

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    try {
      // Step 1: Get or create Paystack customer
      const paystackCustomer = await getOrCreatePaystackCustomer({
        email: user.email,
        first_name: user.name?.split(' ')[0] || undefined,
        last_name: user.name?.split(' ').slice(1).join(' ') || undefined,
      })

      // Step 2: Get or create Paystack plan
      const paystackPlan = await getOrCreatePaystackPlan({
        name: plan.name,
        amount: Math.round(plan.price * 100), // Convert to kobo
        interval: "monthly", // Default to monthly, can be made configurable
        currency: plan.currency === "USD" ? "NGN" : plan.currency, // Paystack uses NGN by default
        description: plan.description || undefined,
      })

      // Step 3: Create Paystack subscription
      // Note: For initial subscription, user needs to authorize payment
      // We'll create the subscription and redirect to authorization
      const now = new Date()
      const periodEnd = addMonths(now, 1)
      const nextBillingDate = addMonths(now, 1)

      // Create subscription in database first (incomplete status)
      const subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          planId: plan.id,
          status: "incomplete",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          billingInterval: BILLING_INTERVAL.MONTHLY,
          nextBillingDate: nextBillingDate,
          providerCustomerId: paystackCustomer.customer_code,
        },
        include: { plan: true }
      })

      // Create Paystack subscription
      // This will require user authorization, so we'll get an authorization URL
      const paystackSubscription = await createPaystackSubscription({
        customer: paystackCustomer.customer_code,
        plan: paystackPlan.plan_code,
      })

      // Update subscription with Paystack subscription ID
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          providerSubscriptionId: paystackSubscription.subscription_code,
        }
      })

      // Create subscription history entry
      await prisma.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: "plan_changed",
          newValue: JSON.stringify({
            planId: plan.id,
            planName: plan.name,
            status: "incomplete",
          }),
          reason: "New subscription created",
        }
      })

      // Create audit log
      if (session.user.id) {
        await createAuditLog({
          userId: session.user.id,
          action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
          resource: "subscription",
          resourceId: subscription.id,
          details: {
            planId: plan.id,
            planName: plan.name,
            providerSubscriptionId: paystackSubscription.subscription_code,
          }
        });
      }

      // Return subscription with authorization info if needed
      // Paystack subscription creation may require user to authorize payment
      return NextResponse.json({
        subscription: {
          ...subscription,
          providerSubscriptionId: paystackSubscription.subscription_code,
        },
        authorizationCode: paystackSubscription.authorization?.authorization_code || null,
        message: "Subscription created. Please authorize payment to activate.",
      })
    } catch (error: any) {
      console.error("Error creating Paystack subscription:", error)
      return NextResponse.json(
        {
          error: "Failed to create subscription",
          details: error.message || String(error)
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Error creating subscription:", error)
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["active", "past_due"] }
      },
      include: { plan: true }
    })

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    // Cancel Paystack subscription if providerSubscriptionId exists
    if (subscription.providerSubscriptionId) {
      try {
        const { cancelPaystackSubscription } = await import("@/lib/paystack-subscription")
        await cancelPaystackSubscription(subscription.providerSubscriptionId)
      } catch (error) {
        console.error("Error canceling Paystack subscription:", error)
        // Continue with local cancellation even if Paystack fails
      }
    }

    // Update subscription
    const updatedSubscription = await prisma.$transaction(async (tx) => {
      // Cancel at period end
      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          status: "active" // Keep active until period ends
        }
      })

      // Create subscription history entry
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: "cancelled",
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({ status: "active", cancelAtPeriodEnd: true }),
          reason: "User requested cancellation",
        }
      })

      return updated
    })

    // Create audit log
    if (session.user.id) {
      await createAuditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
        resource: "subscription",
        resourceId: subscription.id,
        details: {
          action: "cancelled",
          cancelAtPeriodEnd: true,
        }
      });
    }

    return NextResponse.json({ 
      message: "Subscription will be canceled at the end of the billing period",
      subscription: updatedSubscription
    })
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}