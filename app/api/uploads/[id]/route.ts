import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { deleteFromCloudStorage } from "@/lib/storage"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey } from "@/lib/cache"
import { StorageAccountStatus } from "@prisma/client"

// DELETE /api/uploads/[id] - Delete a file
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

    const upload = await prisma.fileUpload.findUnique({
      where: { id },
      include: {
        portal: {
          select: {
            userId: true,
          }
        },
        storageAccount: {
          select: {
            id: true,
            provider: true,
            status: true,
            email: true
          }
        }
      }
    })

    if (!upload) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    if (upload.portal.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check storage account status before allowing delete
    if (upload.storageAccount) {
      const status = upload.storageAccount.status
      if (status === StorageAccountStatus.DISCONNECTED) {
        return NextResponse.json({
          error: "File unavailable",
          details: `Cannot delete file. Your ${upload.storageAccount.provider} storage account is disconnected.`,
          requiresReconnection: true
        }, { status: 403 })
      } else if (status === StorageAccountStatus.ERROR) {
        return NextResponse.json({
          error: "File unavailable", 
          details: "Cannot delete file. There are connection issues with your storage account.",
          isTemporary: true
        }, { status: 503 })
      }
    }

    // Delete from cloud storage if applicable
    if (upload.storageProvider === "google_drive" || upload.storageProvider === "dropbox") {
      const storageId = upload.storageFileId || upload.storagePath
      if (storageId) {
        try {
          await deleteFromCloudStorage(
            session.user.id,
            upload.storageProvider,
            storageId
          )
        } catch (error) {
          console.error("Error deleting from cloud storage:", error)
          // Continue with DB deletion even if cloud deletion fails
        }
      }
    }

    // Delete from database
    await prisma.fileUpload.delete({
      where: { id }
    })

    // Invalidate caches
    await Promise.all([
      invalidateCache(getUserDashboardKey(session.user.id)),
      invalidateCache(getUserUploadsKey(session.user.id)),
      invalidateCache(getUserStatsKey(session.user.id))
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
