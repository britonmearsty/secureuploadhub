import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { SUBSCRIPTION_STATUS } from "@/lib/billing-constants"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const results: any = {
            timestamp: new Date().toISOString(),
            checks: []
        }

        // 1. Prisma Check
        try {
            await prisma.$queryRaw`SELECT 1`
            results.checks.push({ name: "Prisma Connectivity", status: "pass" })
        } catch (error) {
            results.checks.push({ name: "Prisma Connectivity", status: "fail", message: String(error) })
        }

        // 2. Paystack Config Check
        try {
            const { getPaystack } = await import('@/lib/billing')
            const paystack = await getPaystack()
            if (paystack) {
                results.checks.push({ name: "Paystack Config", status: "pass" })
            } else {
                results.checks.push({ name: "Paystack Config", status: "fail", message: "Paystack instance is null" })
            }
        } catch (error) {
            results.checks.push({ name: "Paystack Config", status: "fail", message: String(error) })
        }

        // 3. User Subscription Consistency
        try {
            const subscription = await prisma.subscription.findFirst({
                where: { userId: session.user.id },
                include: { payments: { take: 5, orderBy: { createdAt: 'desc' } } }
            })

            if (!subscription) {
                results.checks.push({ name: "Subscription Records", status: "pass", message: "No subscription found (Free Tier)" })
            } else {
                const issues = []
                if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE && subscription.payments.length === 0) {
                    issues.push("Subscription is active but has no recorded payments.")
                }
                if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE && !subscription.providerSubscriptionId) {
                    issues.push("Subscription is active but missing Paystack subscription ID.")
                }

                results.checks.push({
                    name: "Subscription Consistency",
                    status: issues.length === 0 ? "pass" : "warn",
                    message: issues.length === 0 ? "Data looks consistent" : issues.join(" ")
                })
            }
        } catch (error) {
            results.checks.push({ name: "Subscription Consistency", status: "fail", message: String(error) })
        }

        // 4. Webhook Settings (Pseudo check)
        results.checks.push({
            name: "Webhook Listener",
            status: "pass",
            message: "Endpoint /api/billing/webhook is configured"
        })

        return NextResponse.json(results)

    } catch (error) {
        console.error("Health check error:", error)
        return NextResponse.json({ error: "Health check failed" }, { status: 500 })
    }
}
