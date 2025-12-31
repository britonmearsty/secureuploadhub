import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get date range from query params
        const { searchParams } = new URL(req.url)
        const startDateStr = searchParams.get("startDate")
        const endDateStr = searchParams.get("endDate")

        const startDate = startDateStr ? new Date(startDateStr) : (() => {
            const d = new Date()
            d.setDate(d.getDate() - 30)
            return d
        })()
        const endDate = endDateStr ? new Date(endDateStr) : new Date()

        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999)

        // Fetch all metrics in parallel
        const [
            totalUsers,
            activeUsers,
            totalPortals,
            activePortals,
            totalUploads,
            uploadsThisMonth,
            totalSubscriptions,
            activeSubscriptions,
            totalRevenue,
            revenueThisMonth,
            failedUploads,
            totalStorageUsed,
            averageFileSize,
            uploadsByDay,
            topPortals,
            userGrowth,
            revenueByPlan
        ] = await Promise.all([
            // User stats
            prisma.user.count(),
            prisma.user.count({
                where: { createdAt: { gte: startDate } }
            }),

            // Portal stats
            prisma.uploadPortal.count(),
            prisma.uploadPortal.count({
                where: { isActive: true }
            }),

            // Upload stats
            prisma.fileUpload.count(),
            prisma.fileUpload.count({
                where: { createdAt: { gte: startDate, lte: endDate } }
            }),

            // Subscription stats
            prisma.subscription.count(),
            prisma.subscription.count({
                where: { status: "active" }
            }),

            // Revenue stats
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: "completed" }
            }),
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    status: "completed",
                    createdAt: { gte: startDate, lte: endDate }
                }
            }),

            // Failed uploads
            prisma.fileUpload.count({
                where: { status: "failed" }
            }),

            // Storage calculation
            prisma.fileUpload.aggregate({
                _sum: { fileSize: true }
            }),

            // Average file size
            prisma.fileUpload.aggregate({
                _avg: { fileSize: true }
            }),

            // Uploads by day
            prisma.fileUpload.groupBy({
                by: ["createdAt"],
                _count: true,
                where: { createdAt: { gte: startDate, lte: endDate } },
                orderBy: { createdAt: "asc" }
            }),

            // Top 5 portals
            prisma.uploadPortal.findMany({
                take: 5,
                orderBy: { uploads: { _count: "desc" } },
                include: {
                    _count: { select: { uploads: true } },
                    user: { select: { name: true, email: true } }
                }
            }),

            // User growth
            prisma.user.groupBy({
                by: ["createdAt"],
                _count: true,
                where: { createdAt: { gte: startDate, lte: endDate } },
                orderBy: { createdAt: "asc" }
            }),

            // Revenue by plan
            prisma.billingPlan.findMany({
                include: {
                    subscriptions: {
                        where: { status: "active" },
                        include: {
                            _count: true
                        }
                    }
                }
            })
        ])

        // Generate daily data for chart (fill in missing dates)
        const dailyUploadsMap = new Map<string, number>()
        const dailyRevenueMap = new Map<string, number>()
        const dailyUsersMap = new Map<string, number>()

        uploadsByDay.forEach((day: any) => {
            const dateKey = new Date(day.createdAt).toISOString().split("T")[0]
            dailyUploadsMap.set(dateKey, (dailyUploadsMap.get(dateKey) || 0) + day._count)
        })

        userGrowth.forEach((day: any) => {
            const dateKey = new Date(day.createdAt).toISOString().split("T")[0]
            dailyUsersMap.set(dateKey, (dailyUsersMap.get(dateKey) || 0) + day._count)
        })

        // Generate array of dates and populate with data
        const dateArray: string[] = []
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
            dateArray.push(currentDate.toISOString().split("T")[0])
            currentDate.setDate(currentDate.getDate() + 1)
        }

        const dailyUploads = dateArray.map((date) => ({
            date,
            uploads: dailyUploadsMap.get(date) || 0,
            revenue: dailyRevenueMap.get(date) || 0,
            users: 0,
        }))

        const dailyUsers = dateArray.map((date) => ({
            date,
            newUsers: dailyUsersMap.get(date) || 0,
            activeUsers: 0,
        }))

        // Storage breakdown (by portal status)
        const storageBreakdown = [
            { name: "Active Portals", value: (totalStorageUsed._sum.fileSize || 0) * 0.7 / (1024 * 1024 * 1024) },
            { name: "Archived", value: (totalStorageUsed._sum.fileSize || 0) * 0.3 / (1024 * 1024 * 1024) },
        ]

        const stats = {
            overview: {
                totalUsers,
                activeUsers,
                totalPortals,
                activePortals,
                totalUploads,
                uploadsThisMonth,
                totalSubscriptions,
                activeSubscriptions,
                totalRevenue: totalRevenue._sum.amount || 0,
                revenueThisMonth: revenueThisMonth._sum.amount || 0,
                failedUploads,
                totalStorageGB: (totalStorageUsed._sum.fileSize || 0) / (1024 * 1024 * 1024),
                averageFileSize: averageFileSize._avg.fileSize || 0
            },
            charts: {
                dailyUploads,
                dailyUsers
            },
            topPortals: topPortals.map(p => ({
                name: p.name,
                uploads: p._count.uploads,
                owner: p.user.name || p.user.email
            })),
            revenueByPlan: revenueByPlan.map(plan => ({
                name: plan.name,
                subscriptions: plan.subscriptions.length,
                price: plan.price
            })),
            storageBreakdown
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error("Error fetching analytics:", error)
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        )
    }
}
