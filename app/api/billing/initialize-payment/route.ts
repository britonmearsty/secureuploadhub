import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, amount, planId, currency = "NGN" } = await request.json()

    // Validate input
    if (!email || !amount || !planId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get plan details
    const plan = await prisma.billingPlan.findUnique({
      where: { id: planId }
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Create subscription record
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        status: "INCOMPLETE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })

    // Initialize Paystack transaction
    const reference = `sub_${subscription.id}_${Date.now()}`
    
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_CONFIG.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo
        currency,
        reference,
        callback_url: `${process.env.NEXTAUTH_URL}/dashboard?payment=success`,
        metadata: {
          type: 'subscription_setup',
          subscription_id: subscription.id,
          plan_name: plan.name,
          user_id: session.user.id
        }
      })
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Failed to initialize payment')
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId: session.user.id,
        amount: amount,
        currency,
        status: "PENDING",
        description: `Setup payment for ${plan.name} plan`,
        providerPaymentRef: reference,
      }
    })

    return NextResponse.json({
      access_code: paystackData.data.access_code,
      authorization_url: paystackData.data.authorization_url,
      reference,
      subscription_id: subscription.id
    })

  } catch (error) {
    console.error('Payment initialization error:', error)
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    )
  }
}