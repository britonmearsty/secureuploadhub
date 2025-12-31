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
        const template = await prisma.emailTemplate.findUnique({
            where: { id }
        })

        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ template })
    } catch (error) {
        console.error("Error fetching email template:", error)
        return NextResponse.json(
            { error: "Failed to fetch email template" },
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
        const { subject, body: templateBody, description, isEnabled, variables } = body

        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                ...(subject && { subject }),
                ...(templateBody && { body: templateBody }),
                ...(description !== undefined && { description }),
                ...(isEnabled !== undefined && { isEnabled }),
                ...(variables && { variables })
            }
        })

        return NextResponse.json({ template })
    } catch (error) {
        console.error("Error updating email template:", error)
        return NextResponse.json(
            { error: "Failed to update email template" },
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
        await prisma.emailTemplate.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting email template:", error)
        return NextResponse.json(
            { error: "Failed to delete email template" },
            { status: 500 }
        )
    }
}
