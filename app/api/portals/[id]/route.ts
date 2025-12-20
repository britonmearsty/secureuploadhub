import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/portals/[id] - Get a single portal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const portal = await prisma.uploadPortal.findFirst({
      where: { 
        id,
        userId: session.user.id 
      },
      include: {
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/portals/[id] - Update a portal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existingPortal = await prisma.uploadPortal.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existingPortal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    // If slug is being updated, check for uniqueness
    if (body.slug && body.slug !== existingPortal.slug) {
      const slugExists = await prisma.uploadPortal.findUnique({
        where: { slug: body.slug }
      })
      if (slugExists) {
        return NextResponse.json({ error: "This URL slug is already taken" }, { status: 400 })
      }
    }

    const portal = await prisma.uploadPortal.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        primaryColor: body.primaryColor,
        isActive: body.isActive,
        requireClientName: body.requireClientName,
        requireClientEmail: body.requireClientEmail,
      }
    })

    return NextResponse.json(portal)
  } catch (error) {
    console.error("Error updating portal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/portals/[id] - Delete a portal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const portal = await prisma.uploadPortal.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    await prisma.uploadPortal.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting portal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

