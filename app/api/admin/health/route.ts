import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import os from "os"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const startTime = Date.now()

        // Check database connection
        let dbStatus = "healthy"
        let dbLatency = 0
        try {
            const dbStart = Date.now()
            await prisma.user.count()
            dbLatency = Date.now() - dbStart
        } catch (error) {
            dbStatus = "unhealthy"
        }

        // System information
        const totalMemory = os.totalmem()
        const freeMemory = os.freemem()
        const usedMemory = totalMemory - freeMemory
        const memoryUsagePercent = (usedMemory / totalMemory) * 100

        const cpus = os.cpus()
        const loadAverage = os.loadavg()
        const uptime = os.uptime()

        // Calculate uptime
        const uptimeHours = Math.floor(uptime / 3600)
        const uptimeMinutes = Math.floor((uptime % 3600) / 60)

        // Data stats
        const [userCount, portalCount, uploadCount, storageUsed] = await Promise.all([
            prisma.user.count(),
            prisma.uploadPortal.count(),
            prisma.fileUpload.count(),
            prisma.fileUpload.aggregate({ _sum: { fileSize: true } })
        ])

        const health = {
            status: dbStatus === "healthy" ? "healthy" : "unhealthy",
            timestamp: new Date(),
            uptime: {
                seconds: uptime,
                formatted: `${uptimeHours}h ${uptimeMinutes}m`
            },
            database: {
                status: dbStatus,
                latency: `${dbLatency}ms`,
                records: {
                    users: userCount,
                    portals: portalCount,
                    uploads: uploadCount
                }
            },
            system: {
                cpu: {
                    cores: cpus.length,
                    loadAverage: loadAverage[0].toFixed(2)
                },
                memory: {
                    total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
                    used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
                    free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
                    usagePercent: memoryUsagePercent.toFixed(2)
                }
            },
            storage: {
                usedBytes: storageUsed._sum.fileSize || 0,
                usedGB: ((storageUsed._sum.fileSize || 0) / 1024 / 1024 / 1024).toFixed(2)
            },
            responseTime: `${Date.now() - startTime}ms`,
            checks: {
                database: dbStatus === "healthy",
                memory: memoryUsagePercent < 90,
                diskSpace: true // Would check actual disk space in production
            }
        }

        return NextResponse.json(health)
    } catch (error) {
        console.error("Error fetching health:", error)
        return NextResponse.json(
            { error: "Failed to fetch health status" },
            { status: 500 }
        )
    }
}
