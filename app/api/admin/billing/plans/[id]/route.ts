import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const plan = await prisma.billingPlan.findUnique({
            where: { id },
            include: {
                subscriptions: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: "desc" },
                    take: 10
                },
                _count: {
                    select: { subscriptions: true }
                }
            }
        })

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 })
        }

        return NextResponse.json(plan)
    } catch (error) {
        console.error("Error fetching plan:", error)
        return NextResponse.json(
            { error: "Failed to fetch plan" },
            { status: 500 }
        )
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await req.json()
        const { name, description, price, features, maxPortals, maxStorageGB, maxUploadsMonth, isActive } = body

        const plan = await prisma.billingPlan.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price }),
                ...(features !== undefined && { features }),
                ...(maxPortals !== undefined && { maxPortals }),
                ...(maxStorageGB !== undefined && { maxStorageGB }),
                ...(maxUploadsMonth !== undefined && { maxUploadsMonth }),
                ...(isActive !== undefined && { isActive })
            }
        })

        return NextResponse.json(plan)
    } catch (error) {
        console.error("Error updating plan:", error)
        return NextResponse.json(
            { error: "Failed to update plan" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        await prisma.billingPlan.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting plan:", error)
        return NextResponse.json(
            { error: "Failed to delete plan" },
            { status: 500 }
        )
    }
}
