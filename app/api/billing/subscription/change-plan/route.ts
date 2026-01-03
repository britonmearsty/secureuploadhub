import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { updatePaystackSubscription, getOrCreatePaystackPlan } from "@/lib/paystack-subscription"
import { calculateProration, isUpgrade, isDowngrade } from "@/lib/billing-proration"
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS, SUBSCRIPTION_HISTORY_ACTION } from "@/lib/billing-constants"
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log"
import { addMonths } from "date-fns"
import { z } from "zod"
import { getPaystackCurrency, convertToPaystackSubunit } from "@/lib/paystack-currency"

export const dynamic = 'force-dynamic'

const changePlanSchema = z.object({
  newPlanId: z.string().min(1),
  effectiveDate: z.enum(["immediate", "next_period"]).default("immediate"),
  prorateBilling: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { newPlanId, effectiveDate, prorateBilling } = changePlanSchema.parse(body)

    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.PAST_DUE] }
      },
      include: {
        plan: true,
        user: true
      }
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      )
    }

    // Get new plan
    const newPlan = await prisma.billingPlan.findUnique({
      where: { id: newPlanId }
    })

    if (!newPlan || !newPlan.isActive) {
      return NextResponse.json(
        { error: "New plan not found or inactive" },
        { status: 404 }
      )
    }

    if (subscription.planId === newPlanId) {
      return NextResponse.json(
        { error: "Subscription is already on this plan" },
        { status: 400 }
      )
    }

    // Calculate proration if needed
    let prorationResult = null
    if (prorateBilling && effectiveDate === "immediate") {
      prorationResult = calculateProration(
        subscription.plan.price,
        newPlan.price,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        new Date()
      )
    }

    // Update Paystack subscription if providerSubscriptionId exists
    if (subscription.providerSubscriptionId) {
      try {
        // Get or create Paystack plan
        const paystackCurrency = getPaystackCurrency(newPlan.currency);
        const paystackPlan = await getOrCreatePaystackPlan({
          name: newPlan.name,
          amount: convertToPaystackSubunit(newPlan.price, paystackCurrency),
          interval: subscription.billingInterval === "yearly" ? "annually" : "monthly",
          currency: paystackCurrency,
          description: newPlan.description || undefined,
        })

        // Update Paystack subscription
        await updatePaystackSubscription(subscription.providerSubscriptionId, {
          plan: paystackPlan.plan_code,
        })
      } catch (error: any) {
        console.error("Error updating Paystack subscription:", error)
        return NextResponse.json(
          { error: "Failed to update subscription with payment provider", details: error.message },
          { status: 500 }
        )
      }
    }

    // Update subscription in database
    const updatedSubscription = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        planId: newPlanId,
        updatedAt: new Date(),
      }

      // If immediate change, keep current period dates
      // If next_period, dates will be updated on next renewal
      if (effectiveDate === "immediate") {
        // Keep current period dates but update plan
      } else {
        // Will change on next renewal
      }

      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: updateData,
        include: {
          plan: true,
          user: true
        }
      })

      // Create proration payment record if needed
      if (prorationResult && prorationResult.amount !== 0) {
        const paymentStatus = prorationResult.amount > 0 
          ? PAYMENT_STATUS.PENDING 
          : PAYMENT_STATUS.SUCCEEDED // Credit is immediate

        await tx.payment.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            amount: Math.abs(prorationResult.amount),
            currency: subscription.plan.currency,
            status: paymentStatus,
            description: prorationResult.description,
            providerPaymentRef: `proration_${subscription.id}_${Date.now()}`,
          }
        })
      }

      // Create subscription history entry
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: SUBSCRIPTION_HISTORY_ACTION.PLAN_CHANGED,
          oldValue: JSON.stringify({
            planId: subscription.planId,
            planName: subscription.plan.name,
            price: subscription.plan.price,
          }),
          newValue: JSON.stringify({
            planId: newPlanId,
            planName: newPlan.name,
            price: newPlan.price,
            effectiveDate,
            prorationAmount: prorationResult?.amount || 0,
          }),
          reason: `Plan changed from ${subscription.plan.name} to ${newPlan.name}`,
        }
      })

      return updated
    })

    // Create audit log
    if (session.user.id) {
      await createAuditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.SUBSCRIPTION_MIGRATED,
        resource: "subscription",
        resourceId: subscription.id,
        details: {
          oldPlanId: subscription.planId,
          oldPlanName: subscription.plan.name,
          newPlanId,
          newPlanName: newPlan.name,
          effectiveDate,
          prorationAmount: prorationResult?.amount || 0,
        }
      });
    }

    // TODO: Send plan change notification email

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      proration: prorationResult,
      message: `Subscription plan changed from ${subscription.plan.name} to ${newPlan.name}`,
    })
  } catch (error: any) {
    console.error("Error changing subscription plan:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to change subscription plan", details: error.message },
      { status: 500 }
    )
  }
}

