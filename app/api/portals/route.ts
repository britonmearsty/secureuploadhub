import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/portals - List all portals for the current user
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const portals = await prisma.uploadPortal.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { uploads: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(portals)
  } catch (error) {
    console.error("Error fetching portals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/portals - Create a new portal
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, description, primaryColor, requireClientName, requireClientEmail } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    // Validate slug format (lowercase letters, numbers, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ 
        error: "Slug can only contain lowercase letters, numbers, and hyphens" 
      }, { status: 400 })
    }

    // Check if slug is already taken
    const existingPortal = await prisma.uploadPortal.findUnique({
      where: { slug }
    })

    if (existingPortal) {
      return NextResponse.json({ error: "This URL slug is already taken" }, { status: 400 })
    }

    // Create the portal
    const portal = await prisma.uploadPortal.create({
      data: {
        userId: session.user.id,
        name,
        slug,
        description: description || null,
        primaryColor: primaryColor || "#4F46E5",
        requireClientName: requireClientName ?? true,
        requireClientEmail: requireClientEmail ?? false,
      }
    })

    return NextResponse.json(portal, { status: 201 })
  } catch (error) {
    console.error("Error creating portal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

