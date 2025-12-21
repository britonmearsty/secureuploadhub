import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get("x-paystack-signature")

    // Verify webhook signature
    const secretHash = PAYSTACK_CONFIG.webhookSecret
    if (!secretHash) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    // Paystack webhook verification (simplified - in production you'd verify the signature)
    const { event, data } = body

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

      const subscription = existingPayment.subscription

      // Update subscription status
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          providerSubscriptionId: paymentId.toString(),
          providerCustomerId: data.customer.id?.toString()
        }
      })

      // Update payment record
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: "succeeded",
          providerPaymentId: paymentId.toString()
        }
      })

      console.log("Subscription activated:", subscription.id)
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