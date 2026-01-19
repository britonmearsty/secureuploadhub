import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getValidAccessToken } from "@/lib/storage"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey } from "@/lib/cache"

// POST /api/storage/user-sync - Automatic sync for current user
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Check if user has auto-sync enabled
    const syncSettings = await prisma.syncSettings.findUnique({
      where: { userId }
    })

    // If no settings exist, create default with auto-sync enabled
    if (!syncSettings) {
      await prisma.syncSettings.create({
        data: {
          userId,
          autoSync: true,
          deleteAfterSync: false,
          syncInterval: 3600 // 1 hour
        }
      })
    } else if (!syncSettings.autoSync) {
      // Auto-sync is disabled for this user
      return NextResponse.json({
        success: true,
        message: "Auto-sync is disabled",
        syncedFiles: 0,
        deletedFiles: 0
      })
    }

    // Check if enough time has passed since last sync (based on syncInterval)
    const now = new Date()
    const lastSyncKey = `last_sync_${userId}`
    
    // For now, we'll sync every time. In production, you might want to implement
    // a more sophisticated timing mechanism using Redis or database
    
    console.log(`🔄 Starting user sync for ${session.user.email}`)

    // Get user's files grouped by provider
    const filesByProvider = await prisma.fileUpload.groupBy({
      by: ['storageProvider'],
      where: {
        portal: {
          userId: userId
        },
        storageProvider: {
          in: ['google_drive', 'dropbox']
        }
      },
      _count: {
        id: true
      }
    })

    let totalSynced = 0
    let totalDeleted = 0
    const results: Array<{provider: string, synced: number, deleted: number}> = []

    for (const providerGroup of filesByProvider) {
      const provider = providerGroup.storageProvider as 'google_drive' | 'dropbox'
      
      if (providerGroup._count.id === 0) continue

      console.log(`  📁 Syncing ${provider} (${providerGroup._count.id} files)`)

      // Get files for this provider
      const files = await prisma.fileUpload.findMany({
        where: {
          storageProvider: provider,
          portal: {
            userId: userId
          }
        },
        select: {
          id: true,
          fileName: true,
          storageFileId: true,
          storagePath: true
        }
      })

      // Check if storage account is connected
      const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
      const tokenResult = await getValidAccessToken(userId, oauthProvider)

      if (!tokenResult) {
        console.log(`  ⚠️ No valid ${provider} account connected`)
        continue
      }

      const orphanedFileIds: string[] = []

      // Check each file to see if it still exists in cloud storage
      for (const file of files) {
        const storageId = file.storageFileId || file.storagePath

        if (!storageId) {
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
                orphanedFileIds.push(file.id)
              }
            }
          }
        } catch (error) {
          console.error(`    Error checking file ${file.fileName}:`, error)
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
              userId: userId
            }
          }
        })

        deletedCount = deleteResult.count
        console.log(`    🗑️ Deleted ${deletedCount} orphaned files from ${provider}`)
      }

      totalSynced += files.length
      totalDeleted += deletedCount
      results.push({
        provider,
        synced: files.length,
        deleted: deletedCount
      })
    }

    // Invalidate caches after sync if files were deleted
    if (totalDeleted > 0) {
      await Promise.all([
        invalidateCache(getUserDashboardKey(userId)),
        invalidateCache(getUserUploadsKey(userId)),
        invalidateCache(getUserStatsKey(userId))
      ])
    }

    console.log(`✅ User sync completed: synced ${totalSynced}, deleted ${totalDeleted}`)

    return NextResponse.json({
      success: true,
      message: "User sync completed",
      syncedFiles: totalSynced,
      deletedFiles: totalDeleted,
      results
    })

  } catch (error) {
    console.error("Error in user sync:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}