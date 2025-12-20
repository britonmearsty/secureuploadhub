import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/public/portals/[slug] - Get a portal by slug (public endpoint)
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
        passwordHash: true,
      }
    })

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    // Don't expose the actual password hash, just whether it's protected
    const { passwordHash, ...portalData } = portal

    return NextResponse.json({
      ...portalData,
      isPasswordProtected: !!passwordHash,
    })
  } catch (error) {
    console.error("Error fetching portal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
