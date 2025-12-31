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
        const limit = parseInt(searchParams.get("limit") || "10")
        const skip = (page - 1) * limit
        const status = searchParams.get("status")

        const [subscriptions, total] = await Promise.all([
            prisma.subscription.findMany({
                where: status ? { status } : {},
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    plan: true
                }
            }),
            prisma.subscription.count({
                where: status ? { status } : {}
            })
        ])

        return NextResponse.json({
            subscriptions,
            total,
            page,
            pages: Math.ceil(total / limit)
        })
    } catch (error) {
        console.error("Error fetching subscriptions:", error)
        return NextResponse.json(
            { error: "Failed to fetch subscriptions" },
            { status: 500 }
        )
    }
}
