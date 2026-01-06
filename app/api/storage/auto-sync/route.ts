import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getValidAccessToken, getStorageService } from "@/lib/storage"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey } from "@/lib/cache"

// POST /api/storage/auto-sync - Automatically sync and clean up orphaned files
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()

    if (!provider || !["google_drive", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    console.log(`🔄 Starting auto-sync for ${provider} (user: ${session.user.id})`)

    // Get user's files for this provider
    const files = await prisma.fileUpload.findMany({
      where: {
        storageProvider: provider,
        portal: {
          userId: session.user.id
        }
      },
      select: {
        id: true,
        fileName: true,
        storageFileId: true,
        storagePath: true
      }
    })

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No files found for ${provider}`,
        syncedFiles: 0,
        deletedFiles: 0
      })
    }

    // Check if storage account is connected
    const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
    const tokenResult = await getValidAccessToken(session.user.id, oauthProvider)

    if (!tokenResult) {
      return NextResponse.json({
        error: `No valid ${provider} account connected`,
        details: "Cannot perform auto-sync without active storage connection"
      }, { status: 403 })
    }

    const service = getStorageService(provider)
    if (!service) {
      return NextResponse.json({ error: "Storage service not available" }, { status: 500 })
    }

    const orphanedFileIds: string[] = []
    let checkedCount = 0

    // Check each file to see if it still exists in cloud storage
    for (const file of files) {
      checkedCount++
      const storageId = file.storageFileId || file.storagePath

      if (!storageId) {
        console.log(`⚠️ File ${file.fileName} has no storage ID, marking as orphaned`)
        orphanedFileIds.push(file.id)
        continue
      }

      try {
        // Try to get file metadata to check if it exists
        if (provider === "google_drive") {
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${storageId}?fields=id,name`,
            {
              headers: {
                Authorization: `Bearer ${tokenResult.accessToken}`,
              },
            }
          )

          if (!response.ok && response.status === 404) {
            console.log(`🗑️ File ${file.fileName} not found in Google Drive, marking for deletion`)
            orphanedFileIds.push(file.id)
          }
        } else if (provider === "dropbox") {
          const response = await fetch(
            `https://api.dropboxapi.com/2/files/get_metadata`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokenResult.accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                path: storageId,
              }),
            }
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            if (errorData.error?.[".tag"] === "path_not_found" || response.status === 409) {
              console.log(`🗑️ File ${file.fileName} not found in Dropbox, marking for deletion`)
              orphanedFileIds.push(file.id)
            }
          }
        }
      } catch (error) {
        console.error(`Error checking file ${file.fileName}:`, error)
        // Don't mark as orphaned if we can't check due to API errors
      }
    }

    // Delete orphaned files from database
    let deletedCount = 0
    if (orphanedFileIds.length > 0) {
      const deleteResult = await prisma.fileUpload.deleteMany({
        where: {
          id: { in: orphanedFileIds },
          portal: {
            userId: session.user.id // Extra safety check
          }
        }
      })

      deletedCount = deleteResult.count

      // Invalidate caches after deletion
      if (deletedCount > 0) {
        await Promise.all([
          invalidateCache(getUserDashboardKey(session.user.id)),
          invalidateCache(getUserUploadsKey(session.user.id)),
          invalidateCache(getUserStatsKey(session.user.id))
        ])
      }

      console.log(`✅ Auto-sync completed: deleted ${deletedCount} orphaned files for ${provider}`)
    }

    return NextResponse.json({
      success: true,
      message: `Auto-sync completed for ${provider}`,
      syncedFiles: checkedCount,
      deletedFiles: deletedCount,
      orphanedFileIds: orphanedFileIds.length <= 10 ? orphanedFileIds : orphanedFileIds.slice(0, 10) // Limit response size
    })

  } catch (error) {
    console.error("Error in auto-sync:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET /api/storage/auto-sync - Get auto-sync status
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get file counts by provider
    const fileCounts = await prisma.fileUpload.groupBy({
      by: ['storageProvider'],
      where: {
        portal: {
          userId: session.user.id
        }
      },
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      success: true,
      fileCounts: fileCounts.reduce((acc, item) => {
        acc[item.storageProvider] = item._count.id
        return acc
      }, {} as Record<string, number>),
      lastSync: new Date().toISOString() // Could be stored in database for real tracking
    })

  } catch (error) {
    console.error("Error getting auto-sync status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}