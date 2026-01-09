import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey, getUserPortalsKey } from "@/lib/cache"
import { StorageAccountStatus } from "@prisma/client"

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
      "logoUrl",
      "backgroundImageUrl",
      "backgroundColor",
      "cardBackgroundColor",
      "textColor",
      "welcomeMessage",
      "submitButtonText",
      "successMessage",
      "requireClientName",
      "requireClientEmail",
      "maxFileSize",
      "isActive",
      "storageProvider",
      "storageFolderId",
      "storageFolderPath",
      "allowedFileTypes",
      "useClientFolders",
    ]

    const safeUpdates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in updates) {
        safeUpdates[field] = updates[field]
      }
    }

    // STORAGE VALIDATION: Check if trying to activate portal with inactive/disconnected storage
    if (safeUpdates.isActive === true && existingPortal.storageAccountId) {
      const storageAccount = await prisma.storageAccount.findUnique({
        where: { id: existingPortal.storageAccountId },
        select: { status: true, provider: true, email: true }
      })

      if (storageAccount) {
        const providerName = storageAccount.provider === 'google_drive' ? 'Google Drive' : 'Dropbox'
        
        if (storageAccount.status === StorageAccountStatus.DISCONNECTED) {
          return NextResponse.json({
            error: `Cannot activate portal. Your ${providerName} storage account is disconnected. Please reconnect your storage account first.`,
            code: "STORAGE_DISCONNECTED",
            storageProvider: storageAccount.provider,
            storageEmail: storageAccount.email,
            actionRequired: "reconnect"
          }, { status: 400 })
        } else if (storageAccount.status === StorageAccountStatus.INACTIVE) {
          return NextResponse.json({
            error: `Cannot activate portal. Your ${providerName} storage account is deactivated. Please reactivate your storage account first.`,
            code: "STORAGE_INACTIVE",
            storageProvider: storageAccount.provider,
            storageEmail: storageAccount.email,
            actionRequired: "reactivate"
          }, { status: 400 })
        } else if (storageAccount.status === StorageAccountStatus.ERROR) {
          return NextResponse.json({
            error: `Cannot activate portal. There are connection issues with your ${providerName} storage account. Please check your storage connection.`,
            code: "STORAGE_ERROR",
            storageProvider: storageAccount.provider,
            storageEmail: storageAccount.email,
            actionRequired: "fix"
          }, { status: 400 })
        }
      }
    }

    // Validate storage provider if changing
    if (safeUpdates.storageProvider) {
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

    // Invalidate all relevant caches since portal data changed
    await Promise.all([
      invalidateCache(getUserDashboardKey(session.user.id)),
      invalidateCache(getUserPortalsKey(session.user.id)),
      invalidateCache(getUserUploadsKey(session.user.id)),
      invalidateCache(getUserStatsKey(session.user.id))
    ])

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

    // Invalidate all relevant caches since portal was deleted
    await Promise.all([
      invalidateCache(getUserDashboardKey(session.user.id)),
      invalidateCache(getUserPortalsKey(session.user.id)),
      invalidateCache(getUserUploadsKey(session.user.id)),
      invalidateCache(getUserStatsKey(session.user.id))
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting portal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
