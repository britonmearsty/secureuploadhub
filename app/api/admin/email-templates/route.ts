import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const templates = await prisma.emailTemplate.findMany({
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json({ templates })
    } catch (error) {
        console.error("Error fetching email templates:", error)
        return NextResponse.json(
            { error: "Failed to fetch email templates" },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { name, displayName, subject, body: templateBody, description, variables } = body

        if (!name || !displayName || !subject || !templateBody) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const template = await prisma.emailTemplate.create({
            data: {
                name,
                displayName,
                subject,
                body: templateBody,
                description,
                variables: variables || []
            }
        })

        return NextResponse.json({ template }, { status: 201 })
    } catch (error) {
        console.error("Error creating email template:", error)
        return NextResponse.json(
            { error: "Failed to create email template" },
            { status: 500 }
        )
    }
}
