import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/public/portals/[slug] - Get portal info for public upload page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const portal = await prisma.uploadPortal.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        primaryColor: true,
        isActive: true,
        requireClientName: true,
        requireClientEmail: true,
        maxFileSize: true,
        allowedFileTypes: true,
      }
    })

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    return NextResponse.json(portal)
  } catch (error) {
    console.error("Error fetching portal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

