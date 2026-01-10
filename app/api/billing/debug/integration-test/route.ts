import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { activateSubscription } from "@/lib/subscription-manager"
import { SUBSCRIPTION_STATUS } from "@/lib/billing-constants"

export const dynamic = 'force-dynamic'

/**
 * Integration Test for Billing
 * Simulates an activation flow for the current user's incomplete subscription (if any)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Find an incomplete subscription to test with
        let subscription = await prisma.subscription.findFirst({
            where: {
                userId: session.user.id,
                status: SUBSCRIPTION_STATUS.INCOMPLETE
            },
            include: { plan: true }
        })

        if (!subscription) {
            // If no incomplete subscription, try to find an active one to "re-activate" (simulation)
            subscription = await prisma.subscription.findFirst({
                where: { userId: session.user.id },
                include: { plan: true }
            })
        }

        if (!subscription) {
            return NextResponse.json({
                error: "No subscription found to test with. Please try starting a subscription first."
            }, { status: 404 })
        }

        const testRef = `test_${Date.now()}`

        // Run the activation logic with a mock payment
        const result = await activateSubscription({
            subscriptionId: subscription.id,
            paymentData: {
                reference: testRef,
                paymentId: `test_pay_${Date.now()}`,
                amount: subscription.plan.price * 100,
                currency: subscription.plan.currency,
                authorization: {
                    authorization_code: "AUTH_TEST_123"
                }
            },
            source: 'manual'
        })

        return NextResponse.json({
            success: result.result.success,
            reason: result.result.reason,
            subscriptionId: subscription.id,
            testReference: testRef,
            details: result
        })

    } catch (error) {
        console.error("Integration test error:", error)
        return NextResponse.json(
            { error: "Integration test failed", details: String(error) },
            { status: 500 }
        )
    }
}
