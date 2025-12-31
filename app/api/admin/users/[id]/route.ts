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
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                uploadPortals: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        isActive: true,
                        createdAt: true,
                        _count: {
                            select: { uploads: true }
                        }
                    }
                },
                subscriptions: {
                    include: {
                        plan: true
                    }
                },
                payments: {
                    orderBy: { createdAt: "desc" },
                    take: 10
                }
            }
        })

        // Fetch activity logs separately
        const activityLogs = await prisma.systemLog.findMany({
            where: { userId: id },
            orderBy: { createdAt: "desc" },
            take: 50
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json({
            ...user,
            activityLogs
        })
    } catch (error) {
        console.error("Error fetching user:", error)
        return NextResponse.json(
            { error: "Failed to fetch user" },
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
        const { role, name, marketingEmail, notificationEmail } = body

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(role !== undefined && { role }),
                ...(name !== undefined && { name }),
                ...(marketingEmail !== undefined && { marketingEmail }),
                ...(notificationEmail !== undefined && { notificationEmail })
            }
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error("Error updating user:", error)
        return NextResponse.json(
            { error: "Failed to update user" },
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
        // Prevent deleting yourself
        if (id === session.user.id) {
            return NextResponse.json(
                { error: "Cannot delete your own account" },
                { status: 400 }
            )
        }

        // Delete user (cascades to related data)
        await prisma.user.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting user:", error)
        return NextResponse.json(
            { error: "Failed to delete user" },
            { status: 500 }
        )
    }
}
