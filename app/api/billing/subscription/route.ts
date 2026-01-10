import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"
import prisma from "@/lib/prisma"
import {
  getOrCreatePaystackCustomer,
  getOrCreatePaystackPlan,
  createPaystackSubscription,
} from "@/lib/paystack-subscription"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"
import { BILLING_INTERVAL, PAYMENT_STATUS } from "@/lib/billing-constants"
import { getPaystackCurrency, convertToPaystackSubunit } from "@/lib/paystack-currency"
import { cancelSubscription } from "@/lib/subscription-manager"

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
      const paystackCurrency = getPaystackCurrency(plan.currency);
      const paystackPlan = await getOrCreatePaystackPlan({
        name: plan.name,
        amount: convertToPaystackSubunit(plan.price, paystackCurrency),
        interval: "monthly", // Default to monthly, can be made configurable
        currency: paystackCurrency,
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

      // For initial subscription, we need to get authorization from user first
      // Instead of creating subscription immediately, return checkout URL

      // Check if user has existing authorization (saved card)
      let authorizationCode = null;

      // Try to get existing authorization from previous payments
      const existingPayment = await prisma.payment.findFirst({
        where: {
          userId: session.user.id,
          status: PAYMENT_STATUS.SUCCEEDED,
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingPayment) {
        // Check if payment has authorization code (will be available after Prisma regeneration)
        authorizationCode = (existingPayment as any).authorizationCode;
      }

      let paystackSubscription;

      if (authorizationCode) {
        // Create subscription with existing authorization
        paystackSubscription = await createPaystackSubscription({
          customer: paystackCustomer.customer_code,
          plan: paystackPlan.plan_code,
          authorization: authorizationCode,
        });

        // Update subscription with Paystack subscription ID
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            providerSubscriptionId: paystackSubscription.subscription_code,
            status: "active", // Can be active since we have authorization
          }
        });
      } else {
        // No existing authorization - need to redirect user to payment
        // Create a payment initialization for the first payment
        const paystack = await import('@/lib/billing').then(m => m.getPaystack());
        const reference = `sub_${subscription.id}_${Date.now()}`; // Unique reference

        const initializeResponse = await (paystack as any).transaction.initialize({
          email: user.email,
          amount: convertToPaystackSubunit(plan.price, paystackCurrency),
          currency: paystackCurrency,
          reference: reference,
          callback_url: `${PAYSTACK_CONFIG.baseUrl}/dashboard/billing?status=success&subscription_id=${subscription.id}`,
          // Customize available payment channels
          channels: ['card', 'bank', 'ussd', 'bank_transfer'], // Remove unwanted options
          // Add metadata to link payment to subscription
          metadata: {
            type: 'subscription_setup',
            subscription_id: subscription.id,
            user_id: session.user.id,
            plan_id: plan.id,
            user_email: user.email,
            source: 'web_app',
            plan_name: plan.name,
            customer_name: user.name || user.email.split('@')[0]
          },
          // Add custom fields that appear on checkout
          custom_fields: [
            {
              display_name: "Plan Type",
              variable_name: "plan_type",
              value: plan.name
            },
            {
              display_name: "Billing Period",
              variable_name: "billing_period",
              value: "Monthly"
            }
          ]
        });

        if (!initializeResponse.status) {
          throw new Error(`Failed to initialize payment: ${initializeResponse.message}`);
        }

        // Create payment record to link with webhook
        await prisma.payment.create({
          data: {
            subscriptionId: subscription.id,
            userId: session.user.id,
            amount: plan.price,
            currency: plan.currency,
            status: PAYMENT_STATUS.PENDING,
            description: `Initial payment for ${plan.name}`,
            providerPaymentRef: reference,
          }
        })

        return NextResponse.json({
          subscription: subscription,
          requiresAuthorization: true,
          paymentLink: initializeResponse.data.authorization_url,
          message: "Please complete payment to activate your subscription.",
        });
      }

      // Create subscription history entry
      await prisma.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: authorizationCode ? "activated" : "plan_changed",
          newValue: JSON.stringify({
            planId: plan.id,
            planName: plan.name,
            status: authorizationCode ? "active" : "incomplete",
          }),
          reason: authorizationCode ? "Subscription created and activated" : "New subscription created",
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
            providerSubscriptionId: paystackSubscription?.subscription_code,
            hasAuthorization: !!authorizationCode,
          }
        });
      }

      // Return success response for subscriptions with existing authorization
      if (authorizationCode && paystackSubscription) {
        return NextResponse.json({
          subscription: {
            ...subscription,
            providerSubscriptionId: paystackSubscription.subscription_code,
            status: "active",
          },
          message: "Subscription created and activated successfully.",
        })
      }
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

    const result = await cancelSubscription(session.user.id)

    // Check if cancellation was successful
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to cancel subscription" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: result.message,
      subscription: result.subscription
    })
  } catch (error: any) {
    console.error("Error canceling subscription:", error)

    if (error.message === 'No active subscription found') {
      return NextResponse.json({
        error: "No active subscription found. You may not have a subscription or it may already be cancelled."
      }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to cancel subscription. Please try again or contact support." },
      { status: 500 }
    )
  }
}