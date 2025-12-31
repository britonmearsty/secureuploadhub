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
        const blog = await prisma.blogPost.findUnique({
            where: { id }
        })

        if (!blog) {
            return NextResponse.json(
                { error: "Blog not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ blog })
    } catch (error) {
        console.error("Error fetching blog:", error)
        return NextResponse.json(
            { error: "Failed to fetch blog" },
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
            title,
            content,
            excerpt,
            status,
            seoTitle,
            seoDescription,
            seoKeywords,
            featuredImage
        } = body

        const blog = await prisma.blogPost.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(content && { content }),
                ...(excerpt && { excerpt }),
                ...(status && { status, publishedAt: status === "published" ? new Date() : null }),
                ...(seoTitle && { seoTitle }),
                ...(seoDescription && { seoDescription }),
                ...(seoKeywords && { seoKeywords }),
                ...(featuredImage && { featuredImage })
            }
        })

        return NextResponse.json({ blog })
    } catch (error) {
        console.error("Error updating blog:", error)
        return NextResponse.json(
            { error: "Failed to update blog" },
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
        await prisma.blogPost.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting blog:", error)
        return NextResponse.json(
            { error: "Failed to delete blog" },
            { status: 500 }
        )
    }
}
