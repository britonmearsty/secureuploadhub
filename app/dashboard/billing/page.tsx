import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import BillingClient from "./BillingClient"
import { FREE_PLAN, getUserBillingContext, getUserUsage } from "@/lib/billing"

export default async function BillingPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const userId = session.user.id

  const [plans, billingCtx] = await Promise.all([
    prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" }
    }),
    getUserBillingContext(userId)
  ])

  const usage = await getUserUsage(userId, billingCtx.periodStart, billingCtx.periodEnd)

  const initialUsage = {
    portals: usage.portalCount,
    uploads: usage.uploadsThisPeriod,
    storageMB: Math.round(usage.storageBytes / (1024 * 1024))
  }

  const serializedSubscription = billingCtx.subscription ? {
    ...billingCtx.subscription,
    currentPeriodStart: billingCtx.subscription.currentPeriodStart,
    currentPeriodEnd: billingCtx.subscription.currentPeriodEnd,
    payments: billingCtx.subscription.payments.map((p: any) => ({
      ...p,
      createdAt: p.createdAt
    }))
  } : null

  const effectivePlan = billingCtx.subscription?.plan ?? FREE_PLAN

  return (
    <BillingClient
      plans={plans}
      subscription={serializedSubscription as any}
      fallbackPlan={effectivePlan as any}
      initialUsage={initialUsage}
    />
  )
}