import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"
import crypto from "crypto"

export const dynamic = 'force-dynamic'

const addMonths = (date: Date, months: number) => {
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

    if (event === "charge.success") {
      const { reference, id: paymentId, amount, currency, status } = data

      if (status !== "success") {
        return NextResponse.json({ status: "ignored" })
      }

      // Find existing payment record by reference
      const existingPayment = await prisma.payment.findFirst({
        where: { providerPaymentRef: reference },
        include: { subscription: { include: { plan: true, user: true } } }
      })

      if (!existingPayment || !existingPayment.subscription) {
        console.error("Payment or subscription not found for reference:", reference)
        return NextResponse.json({ status: "ignored" })
      }

      if (existingPayment.status === "succeeded") {
        return NextResponse.json({ status: "duplicate" })
      }

      const subscription = existingPayment.subscription
      const now = new Date()
      const periodEnd = addMonths(now, 1)

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "active",
            providerSubscriptionId: data.subscription?.subscription_code ?? subscription.providerSubscriptionId,
            providerCustomerId: data.customer?.id?.toString() || subscription.providerCustomerId,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          }
        }),
        prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "succeeded",
            providerPaymentId: paymentId.toString(),
            amount: (amount || 0) / 100,
            currency: currency || existingPayment.currency,
            description: existingPayment.description ?? `Payment for ${subscription.plan?.name ?? "plan"}`
          }
        })
      ])

      console.log("Subscription activated:", subscription.id)
    }

    if (event === "charge.failed") {
      const { reference } = data
      const payment = await prisma.payment.findFirst({
        where: { providerPaymentRef: reference }
      })

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "failed" }
        })
      }
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