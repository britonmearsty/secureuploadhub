import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import AdminDashboardClient from "./AdminDashboardClient"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    // Fetch admin-level stats
    const [totalUsers, totalPortals, totalUploads, recentUsers, systemLogs] = await Promise.all([
        prisma.user.count(),
        prisma.uploadPortal.count(),
        prisma.fileUpload.count(),
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                createdAt: true,
            }
        }),
        prisma.systemLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                action: true,
                resource: true,
                userName: true,
                status: true,
                createdAt: true,
            }
        })
    ])

    const stats = {
        totalUsers,
        totalPortals,
        totalUploads,
    }

    // Generate trend data for the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const uploads = await prisma.fileUpload.findMany({
        where: {
            createdAt: { gte: sevenDaysAgo }
        },
        select: {
            createdAt: true
        }
    })

    const users = await prisma.user.findMany({
        where: {
            createdAt: { gte: sevenDaysAgo }
        },
        select: {
            createdAt: true
        }
    })

    // Group by date
    const trendMap = new Map<string, { users: number; uploads: number; revenue: number }>()
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        trendMap.set(dateStr, { users: 0, uploads: 0, revenue: 0 })
    }

    uploads.forEach(u => {
        const dateStr = new Date(u.createdAt).toISOString().split('T')[0]
        const entry = trendMap.get(dateStr)
        if (entry) entry.uploads++
    })

    users.forEach(u => {
        const dateStr = new Date(u.createdAt).toISOString().split('T')[0]
        const entry = trendMap.get(dateStr)
        if (entry) entry.users++
    })

    const trendData = {
        daily: Array.from(trendMap.entries()).map(([date, data]) => ({
            date,
            ...data
        }))
    }

    // Generate system alerts
    const failedUploads = await prisma.fileUpload.count({
        where: { status: "failed" }
    })

    const systemAlerts = []
    
    if (failedUploads > 10) {
        systemAlerts.push({
            id: "failed-uploads",
            type: "warning" as const,
            title: "High Failed Upload Rate",
            message: `${failedUploads} uploads have failed recently`,
            timestamp: new Date()
        })
    }

    if (systemAlerts.length === 0) {
        systemAlerts.push({
            id: "system-healthy",
            type: "info" as const,
            title: "System Status",
            message: "All systems operating normally",
            timestamp: new Date()
        })
    }

    // Transform system logs for activity feed
    const activityLog = systemLogs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        userName: log.userName || undefined,
        status: log.status,
        timestamp: log.createdAt
    }))

    // Cache info - track when data was last updated
    const cacheInfo = {
        lastUpdated: new Date(),
        dataAge: "just now"
    }

    // Rate limit simulation - in production, get from API gateway or session
    // This represents remaining requests in current time window
    const totalRateLimit = 1000
    const usedRequests = Math.floor(Math.random() * 300) // Simulated usage
    const rateLimit = {
        remaining: totalRateLimit - usedRequests,
        limit: totalRateLimit,
        resetTime: new Date(Date.now() + 3600000) // Reset in 1 hour
    }

    return (
        <AdminDashboardClient
            stats={stats}
            recentUsers={recentUsers}
            trendData={trendData}
            systemAlerts={systemAlerts}
            activityLog={activityLog}
            cacheInfo={cacheInfo}
            rateLimit={rateLimit}
        />
    )
}
