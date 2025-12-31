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

        const [portals, total] = await Promise.all([
            prisma.uploadPortal.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    },
                    _count: {
                        select: { uploads: true }
                    }
                }
            }),
            prisma.uploadPortal.count()
        ])

        return NextResponse.json({
            portals,
            total,
            page,
            pages: Math.ceil(total / limit)
        })
    } catch (error) {
        console.error("Error fetching portals:", error)
        return NextResponse.json(
            { error: "Failed to fetch portals" },
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
        const { userId, name, slug, description } = body

        if (!userId || !name || !slug) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        // Check if slug is unique
        const existingPortal = await prisma.uploadPortal.findUnique({
            where: { slug }
        })

        if (existingPortal) {
            return NextResponse.json(
                { error: "Slug already exists" },
                { status: 400 }
            )
        }

        const portal = await prisma.uploadPortal.create({
            data: {
                userId,
                name,
                slug,
                description,
                isActive: true
            }
        })

        return NextResponse.json(portal)
    } catch (error) {
        console.error("Error creating portal:", error)
        return NextResponse.json(
            { error: "Failed to create portal" },
            { status: 500 }
        )
    }
}
