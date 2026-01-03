import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getPaystack } from "@/lib/billing"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

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

    // Create Paystack transaction
    const reference = `sub_${session.user.id}_${Date.now()}`
    const paystack = await getPaystack()
    const response = await paystack.transaction.initialize({
      amount: Math.round(plan.price * 100), // amount in kobo
      email: user.email,
      reference,
      callback_url: `${PAYSTACK_CONFIG.baseUrl}/dashboard/billing?status=processing&reference=${reference}`,
      metadata: {
        planId: plan.id,
        userId: session.user.id,
        planName: plan.name
      }
    })

    if (response.status) {
      // Create pending subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          planId: plan.id,
          status: "incomplete",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
        include: { plan: true }
      })

      // Create pending payment record
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          userId: session.user.id,
          amount: plan.price,
          currency: plan.currency,
          status: "pending",
          providerPaymentRef: reference,
          description: `Payment for ${plan.name} plan`
        }
      })

      return NextResponse.json({
        subscription,
        paymentLink: response.data.authorization_url,
        reference
      })
    } else {
      return NextResponse.json(
        { error: "Failed to initialize payment" },
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
      }
    })

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    // Cancel at period end
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        status: "active" // Keep active until period ends
      }
    })

    return NextResponse.json({ message: "Subscription will be canceled at the end of the billing period" })
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}