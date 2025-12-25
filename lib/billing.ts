import prisma from "./prisma"

const BYTES_IN_GB = 1024 * 1024 * 1024

// Fallback plan for users without a paid subscription
type BillingPlanLike = {
  id: string
  name: string
  description?: string | null
  price: number
  currency: string
  features: string[]
  maxPortals: number
  maxStorageGB: number
  maxUploadsMonth: number
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const FREE_PLAN: BillingPlanLike = {
  id: "free",
  name: "Free",
  description: "Default free tier",
  price: 0,
  currency: "USD",
  features: [
    "1 portal",
    "1GB total storage",
    "100 uploads per month",
  ],
  maxPortals: 1,
  maxStorageGB: 1,
  maxUploadsMonth: 100,
  isActive: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
}

type PlanWithLimits = BillingPlanLike & { maxStorageBytes: number }

const toPlanWithLimits = (plan: BillingPlanLike): PlanWithLimits => ({
  ...plan,
  maxStorageBytes: plan.maxStorageGB * BYTES_IN_GB,
})

const getCurrentPeriodBounds = (overrideStart?: Date, overrideEnd?: Date) => {
  const now = new Date()
  if (overrideStart && overrideEnd) {
    return { start: overrideStart, end: overrideEnd }
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))
  return { start, end }
}

export const getPaystack = async () => {
  const { PAYSTACK_CONFIG } = await import("./paystack-config")
  const paystackModule = await import("paystack-api")
  const Paystack = (paystackModule.default || paystackModule) as any
  return new Paystack(PAYSTACK_CONFIG.secretKey)
}

export const getUserBillingContext = async (userId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "past_due", "incomplete"] }
    },
    include: {
      plan: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    },
    orderBy: { updatedAt: "desc" }
  })

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/dedfc9f2-1f60-4578-9e5d-d5e6a43692a1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'D',
      location: 'lib/billing.ts:getUserBillingContext',
      message: 'Subscription fetched',
      data: {
        hasSubscription: !!subscription,
        hasPayments: !!(subscription as any)?.payments,
        paymentsCount: (subscription as any)?.payments?.length ?? 0,
        planId: subscription?.planId
      },
      timestamp: Date.now()
    })
  }).catch(() => { })
  // #endregion

  const plan = subscription?.plan ? toPlanWithLimits(subscription.plan as any) : toPlanWithLimits(FREE_PLAN)

  const { start: periodStart, end: periodEnd } = getCurrentPeriodBounds(
    subscription?.currentPeriodStart,
    subscription?.currentPeriodEnd
  )

  return { subscription, plan, periodStart, periodEnd }
}

export const getUserUsage = async (userId: string, periodStart: Date, periodEnd: Date) => {
  const [portalCount, uploadsPeriod, storageTotal] = await Promise.all([
    prisma.uploadPortal.count({ where: { userId } }),
    prisma.fileUpload.count({
      where: {
        portal: { userId },
        createdAt: { gte: periodStart, lt: periodEnd }
      }
    }),
    prisma.fileUpload.aggregate({
      where: { portal: { userId } },
      _sum: { fileSize: true }
    })
  ])

  const storageBytes = storageTotal._sum.fileSize || 0
  return { portalCount, uploadsThisPeriod: uploadsPeriod, storageBytes }
}

export const assertPortalLimit = async (userId: string) => {
  const { plan, periodStart, periodEnd } = await getUserBillingContext(userId)
  const usage = await getUserUsage(userId, periodStart, periodEnd)

  if (usage.portalCount >= plan.maxPortals) {
    throw new Error(`Portal limit reached for your plan (${plan.maxPortals}). Upgrade to add more portals.`)
  }

  return { plan, usage, periodStart, periodEnd }
}

export const assertUploadAllowed = async (userId: string, fileSizeBytes: number) => {
  const { plan, periodStart, periodEnd } = await getUserBillingContext(userId)
  const usage = await getUserUsage(userId, periodStart, periodEnd)

  if (usage.uploadsThisPeriod >= plan.maxUploadsMonth) {
    throw new Error(`Upload limit reached for this billing period (${plan.maxUploadsMonth}). Upgrade your plan to continue uploading.`)
  }

  if (usage.storageBytes + fileSizeBytes > plan.maxStorageBytes) {
    throw new Error(`Storage limit exceeded for your plan (${plan.maxStorageGB}GB total). Delete files or upgrade your plan.`)
  }

  if (fileSizeBytes > plan.maxStorageBytes) {
    throw new Error(`Single file exceeds plan storage limit (${plan.maxStorageGB}GB).`)
  }

  return { plan, usage, periodStart, periodEnd }
}