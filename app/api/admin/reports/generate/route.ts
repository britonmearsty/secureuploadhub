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
        const { type, startDate, endDate } = body

        const start = new Date(startDate)
        const end = new Date(endDate)

        let reportData: any = {
            type,
            startDate: start,
            endDate: end,
            generatedAt: new Date(),
            generatedBy: session.user.name || session.user.email
        }

        switch (type) {
            case "users":
                reportData.data = await prisma.user.findMany({
                    where: {
                        createdAt: {
                            gte: start,
                            lte: end
                        }
                    },
                    include: {
                        _count: {
                            select: { uploadPortals: true, subscriptions: true }
                        }
                    }
                })
                break

            case "uploads":
                reportData.data = await prisma.fileUpload.findMany({
                    where: {
                        createdAt: {
                            gte: start,
                            lte: end
                        }
                    },
                    include: {
                        portal: { select: { name: true, user: { select: { name: true, email: true } } } }
                    }
                })
                break

            case "revenue":
                const payments = await prisma.payment.findMany({
                    where: {
                        createdAt: {
                            gte: start,
                            lte: end
                        }
                    },
                    include: {
                        user: { select: { name: true, email: true } },
                        subscription: { select: { plan: { select: { name: true } } } }
                    }
                })
                const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
                reportData.data = payments
                reportData.summary = {
                    totalPayments: payments.length,
                    totalRevenue,
                    averagePayment: payments.length > 0 ? totalRevenue / payments.length : 0,
                    successfulPayments: payments.filter(p => p.status === "completed").length
                }
                break

            case "portals":
                reportData.data = await prisma.uploadPortal.findMany({
                    where: {
                        createdAt: {
                            gte: start,
                            lte: end
                        }
                    },
                    include: {
                        user: { select: { name: true, email: true } },
                        _count: { select: { uploads: true } }
                    }
                })
                break

            case "activity":
                reportData.data = await prisma.systemLog.findMany({
                    where: {
                        createdAt: {
                            gte: start,
                            lte: end
                        }
                    },
                    orderBy: { createdAt: "desc" }
                })
                break

            default:
                return NextResponse.json(
                    { error: "Invalid report type" },
                    { status: 400 }
                )
        }

        return NextResponse.json(reportData)
    } catch (error) {
        console.error("Error generating report:", error)
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 500 }
        )
    }
}
