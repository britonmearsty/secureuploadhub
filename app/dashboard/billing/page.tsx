import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import BillingClient from "./BillingClient"

export default async function BillingPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const userId = session.user.id

  // Fetch plans, subscription, and usage data in parallel
  const [plans, subscription, portals, uploads] = await Promise.all([
    prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" }
    }),
    prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["active", "past_due"] }
      },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    }),
    prisma.uploadPortal.findMany({
      where: { userId },
      select: { id: true }
    }),
    prisma.fileUpload.findMany({
      where: {
        portal: { userId }
      },
      select: { fileSize: true }
    })
  ])

  // Process data for the client component
  const initialUsage = {
    portals: portals.length,
    uploads: uploads.length,
    storageMB: Math.round(uploads.reduce((acc: number, curr: { fileSize: number }) => acc + curr.fileSize, 0) / (1024 * 1024))
  }

  // Map to common interface
  const serializedSubscription = subscription ? {
    ...subscription,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    payments: subscription.payments.map((p: any) => ({
      ...p,
      createdAt: p.createdAt
    }))
  } : null

  return (
    <BillingClient
      plans={plans}
      subscription={serializedSubscription as any}
      initialUsage={initialUsage}
    />
  )
}