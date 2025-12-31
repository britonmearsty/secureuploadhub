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
        const portal = await prisma.uploadPortal.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                uploads: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    select: {
                        id: true,
                        fileName: true,
                        fileSize: true,
                        clientName: true,
                        clientEmail: true,
                        status: true,
                        createdAt: true
                    }
                },
                _count: {
                    select: { uploads: true }
                }
            }
        })

        if (!portal) {
            return NextResponse.json({ error: "Portal not found" }, { status: 404 })
        }

        return NextResponse.json(portal)
    } catch (error) {
        console.error("Error fetching portal:", error)
        return NextResponse.json(
            { error: "Failed to fetch portal" },
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
        const {
            name,
            description,
            isActive,
            primaryColor,
            maxFileSize,
            allowedFileTypes,
            requireClientName,
            requireClientEmail
        } = body

        const portal = await prisma.uploadPortal.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive }),
                ...(primaryColor !== undefined && { primaryColor }),
                ...(maxFileSize !== undefined && { maxFileSize }),
                ...(allowedFileTypes !== undefined && { allowedFileTypes }),
                ...(requireClientName !== undefined && { requireClientName }),
                ...(requireClientEmail !== undefined && { requireClientEmail })
            }
        })

        return NextResponse.json(portal)
    } catch (error) {
        console.error("Error updating portal:", error)
        return NextResponse.json(
            { error: "Failed to update portal" },
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
        await prisma.uploadPortal.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting portal:", error)
        return NextResponse.json(
            { error: "Failed to delete portal" },
            { status: 500 }
        )
    }
}
