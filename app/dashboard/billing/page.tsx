import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import BillingClient from "./BillingClient"
import { FREE_PLAN, getUserBillingContext, getUserUsage } from "@/lib/billing"

export const dynamic = "force-dynamic"

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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/dedfc9f2-1f60-4578-9e5d-d5e6a43692a1',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'debug-session',
      runId:'pre-fix',
      hypothesisId:'A',
      location:'app/dashboard/billing/page.tsx:getUserBillingContext',
      message:'Billing context fetched',
      data:{
        hasSubscription:!!billingCtx.subscription,
        subscriptionKeys: billingCtx.subscription ? Object.keys(billingCtx.subscription) : [],
        planId: billingCtx.subscription?.planId,
      },
      timestamp:Date.now()
    })
  }).catch(()=>{})
  // #endregion

  const usage = await getUserUsage(userId, billingCtx.periodStart, billingCtx.periodEnd)

  const initialUsage = {
    portals: usage.portalCount,
    uploads: usage.uploadsThisPeriod,
    storageMB: Math.round(usage.storageBytes / (1024 * 1024))
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/dedfc9f2-1f60-4578-9e5d-d5e6a43692a1',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'debug-session',
      runId:'pre-fix',
      hypothesisId:'C',
      location:'app/dashboard/billing/page.tsx:usage',
      message:'Usage computed',
      data:{
        portals: usage.portalCount,
        uploads: usage.uploadsThisPeriod,
        storageBytes: usage.storageBytes
      },
      timestamp:Date.now()
    })
  }).catch(()=>{})
  // #endregion

  const serializedSubscription = billingCtx.subscription ? {
    ...billingCtx.subscription,
    currentPeriodStart: billingCtx.subscription.currentPeriodStart,
    currentPeriodEnd: billingCtx.subscription.currentPeriodEnd,
    payments: (billingCtx.subscription as any)?.payments?.map((p: any) => ({
      ...p,
      createdAt: p.createdAt
    })) ?? []
  } : null

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/dedfc9f2-1f60-4578-9e5d-d5e6a43692a1',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'debug-session',
      runId:'pre-fix',
      hypothesisId:'B',
      location:'app/dashboard/billing/page.tsx:serializedSubscription',
      message:'Serialized subscription prepared',
      data:{
        serializedHasPayments:Array.isArray(serializedSubscription?.payments),
        paymentsCount: serializedSubscription?.payments?.length ?? 0,
        hasSubscription: !!serializedSubscription,
      },
      timestamp:Date.now()
    })
  }).catch(()=>{})
  // #endregion

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