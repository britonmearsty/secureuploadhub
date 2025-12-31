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
        const status = searchParams.get("status")

        const blogs = await prisma.blogPost.findMany({
            ...(status && { where: { status } }),
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json({ blogs })
    } catch (error) {
        console.error("Error fetching blogs:", error)
        return NextResponse.json(
            { error: "Failed to fetch blogs" },
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
        const { title, slug, content, excerpt, author } = body

        if (!title || !slug || !content || !author) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Check if slug already exists
        const existing = await prisma.blogPost.findUnique({
            where: { slug }
        })

        if (existing) {
            return NextResponse.json(
                { error: "Slug already exists" },
                { status: 400 }
            )
        }

        const blog = await prisma.blogPost.create({
            data: {
                title,
                slug,
                content,
                excerpt,
                author,
                status: "draft"
            }
        })

        return NextResponse.json({ blog }, { status: 201 })
    } catch (error) {
        console.error("Error creating blog:", error)
        return NextResponse.json(
            { error: "Failed to create blog" },
            { status: 500 }
        )
    }
}
