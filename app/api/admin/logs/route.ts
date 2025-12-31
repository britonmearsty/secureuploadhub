import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const skip = (page - 1) * limit
        const action = searchParams.get("action")
        const status = searchParams.get("status")
        const resource = searchParams.get("resource")

        const where: any = {}
        if (action) where.action = action
        if (status) where.status = status
        if (resource) where.resource = resource

        const [logs, total] = await Promise.all([
            prisma.systemLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" }
            }),
            prisma.systemLog.count({ where })
        ])

        return NextResponse.json({
            logs,
            total,
            page,
            pages: Math.ceil(total / limit)
        })
    } catch (error) {
        console.error("Error fetching logs:", error)
        return NextResponse.json(
            { error: "Failed to fetch logs" },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { action, resource, userId, userName, details, status, ipAddress, userAgent } = body

        const log = await prisma.systemLog.create({
            data: {
                action,
                resource,
                userId,
                userName,
                details,
                status: status || "success",
                ipAddress,
                userAgent
            }
        })

        return NextResponse.json(log)
    } catch (error) {
        console.error("Error creating log:", error)
        return NextResponse.json(
            { error: "Failed to create log" },
            { status: 500 }
        )
    }
}
