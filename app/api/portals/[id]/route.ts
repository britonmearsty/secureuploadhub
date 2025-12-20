import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/password"

// GET /api/portals/[id] - Get a specific portal
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
    const updates = await request.json()

    // Verify ownership
    const existingPortal = await prisma.uploadPortal.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingPortal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    // Only allow updating specific fields
    const allowedFields = [
      "name",
      "description",
      "primaryColor",
      "requireClientName",
      "requireClientEmail",
      "maxFileSize",
      "isActive",
      "storageProvider",
      "storageFolderId",
      "storageFolderPath",
      "allowedFileTypes",
    ]

    const safeUpdates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in updates) {
        safeUpdates[field] = updates[field]
      }
    }

    // Validate storage provider if changing
    if (safeUpdates.storageProvider && safeUpdates.storageProvider !== "local") {
      const oauthProvider = safeUpdates.storageProvider === "google_drive" ? "google" : "dropbox"
      const account = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: oauthProvider,
        },
      })

      if (!account) {
        return NextResponse.json({
          error: `Please connect your ${safeUpdates.storageProvider === "google_drive" ? "Google" : "Dropbox"} account first`
        }, { status: 400 })
      }
    }

    // Handle password update
    if (updates.newPassword) {
      safeUpdates.passwordHash = hashPassword(updates.newPassword)
    }

    const portal = await prisma.uploadPortal.update({
      where: { id },
      data: safeUpdates
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
    const existingPortal = await prisma.uploadPortal.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingPortal) {
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
