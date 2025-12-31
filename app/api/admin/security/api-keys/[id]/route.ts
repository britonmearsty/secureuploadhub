import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

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
        const { isActive, name } = body

        const apiKey = await prisma.apiKey.update({
            where: { id },
            data: {
                ...(isActive !== undefined && { isActive }),
                ...(name !== undefined && { name })
            }
        })

        return NextResponse.json({
            id: apiKey.id,
            name: apiKey.name,
            key: apiKey.key.substring(0, 8) + "..." + apiKey.key.substring(apiKey.key.length - 4),
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt
        })
    } catch (error) {
        console.error("Error updating API key:", error)
        return NextResponse.json(
            { error: "Failed to update API key" },
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
        await prisma.apiKey.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting API key:", error)
        return NextResponse.json(
            { error: "Failed to delete API key" },
            { status: 500 }
        )
    }
}
