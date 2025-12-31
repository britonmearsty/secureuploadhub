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

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where: status ? { status } : {},
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    subscription: { select: { id: true, plan: { select: { name: true } } } }
                }
            }),
            prisma.payment.count({
                where: status ? { status } : {}
            })
        ])

        // Calculate totals
        const totals = await prisma.payment.aggregate({
            where: status ? { status } : {},
            _sum: { amount: true },
            _count: true
        })

        return NextResponse.json({
            payments,
            total,
            page,
            pages: Math.ceil(total / limit),
            stats: {
                totalAmount: totals._sum.amount || 0,
                totalPayments: totals._count
            }
        })
    } catch (error) {
        console.error("Error fetching payments:", error)
        return NextResponse.json(
            { error: "Failed to fetch payments" },
            { status: 500 }
        )
    }
}
