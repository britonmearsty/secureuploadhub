import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const stats = await Promise.all([
            prisma.user.count(),
            prisma.uploadPortal.count(),
            prisma.fileUpload.count(),
            prisma.subscription.count(),
            prisma.payment.count(),
            prisma.systemLog.count(),
            prisma.apiKey.count(),
            prisma.fileUpload.aggregate({ _sum: { fileSize: true } }),
            prisma.systemLog.findMany({
                select: { action: true },
                distinct: ["action"]
            })
        ])

        const dbStats = {
            tables: {
                users: { count: stats[0], description: "User accounts" },
                uploadPortals: { count: stats[1], description: "File transfer portals" },
                fileUploads: { count: stats[2], description: "Uploaded files" },
                subscriptions: { count: stats[3], description: "Active subscriptions" },
                payments: { count: stats[4], description: "Payment records" },
                systemLogs: { count: stats[5], description: "System activity logs" },
                apiKeys: { count: stats[6], description: "API authentication keys" }
            },
            storage: {
                totalBytes: stats[7]._sum.fileSize || 0,
                totalGB: ((stats[7]._sum.fileSize || 0) / 1024 / 1024 / 1024).toFixed(2),
                totalMB: ((stats[7]._sum.fileSize || 0) / 1024 / 1024).toFixed(2)
            },
            activityTypes: stats[8].length,
            timestamp: new Date()
        }

        return NextResponse.json(dbStats)
    } catch (error) {
        console.error("Error fetching database stats:", error)
        return NextResponse.json(
            { error: "Failed to fetch database stats" },
            { status: 500 }
        )
    }
}
