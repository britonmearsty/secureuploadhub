import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import DashboardClient from "./DashboardClient"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const userId = session.user.id

  // Fetch all necessary data in parallel for the dashboard
  const [portals, uploads, statsData] = await Promise.all([
    // Active Portals
    prisma.uploadPortal.findMany({
      where: { userId },
      include: {
        _count: {
          select: { uploads: true }
        }
      },
      orderBy: { createdAt: "desc" },
    }),

    // Recent Uploads
    prisma.fileUpload.findMany({
      where: {
        portal: { userId }
      },
      include: {
        portal: {
          select: {
            name: true,
            slug: true,
            primaryColor: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),

    // Basic count stats (can be optimized further)
    Promise.all([
      prisma.uploadPortal.count({ where: { userId } }),
      prisma.uploadPortal.count({ where: { userId, isActive: true } }),
      prisma.fileUpload.count({ where: { portal: { userId } } }),
      prisma.fileUpload.count({
        where: {
          portal: { userId },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      })
    ])
  ])

  const stats = {
    totalPortals: statsData[0],
    activePortals: statsData[1],
    totalUploads: statsData[2],
    recentUploads: statsData[3]
  }

  return (
    <DashboardClient
      user={session.user}
      stats={stats}
      portals={portals}
      uploads={uploads as any}
    />
  )
}
