import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { type } = body

        let cleanupResult: any = {
            type,
            timestamp: new Date(),
            details: {}
        }

        switch (type) {
            case "failed-uploads":
                const failedCount = await prisma.fileUpload.deleteMany({
                    where: { status: "failed" }
                })
                cleanupResult.details = {
                    deletedRecords: failedCount.count,
                    description: "Deleted all failed upload records"
                }
                break

            case "old-logs":
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

                const logsCount = await prisma.systemLog.deleteMany({
                    where: { createdAt: { lt: thirtyDaysAgo } }
                })
                cleanupResult.details = {
                    deletedRecords: logsCount.count,
                    description: "Deleted logs older than 30 days"
                }
                break

            case "expired-api-keys":
                const now = new Date()
                const expiredCount = await prisma.apiKey.deleteMany({
                    where: {
                        expiresAt: { lt: now }
                    }
                })
                cleanupResult.details = {
                    deletedRecords: expiredCount.count,
                    description: "Deleted expired API keys"
                }
                break

            case "inactive-portals":
                const inactiveCount = await prisma.fileUpload.deleteMany({
                    where: {
                        portal: { isActive: false }
                    }
                })
                cleanupResult.details = {
                    deletedRecords: inactiveCount.count,
                    description: "Deleted uploads from inactive portals"
                }
                break

            default:
                return NextResponse.json(
                    { error: "Invalid cleanup type" },
                    { status: 400 }
                )
        }

        return NextResponse.json(cleanupResult)
    } catch (error) {
        console.error("Error during cleanup:", error)
        return NextResponse.json(
            { error: "Failed to perform cleanup" },
            { status: 500 }
        )
    }
}
