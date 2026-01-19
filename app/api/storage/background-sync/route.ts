import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getValidAccessToken, getStorageService } from "@/lib/storage"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey } from "@/lib/cache"

// POST /api/storage/background-sync - Background sync service for all users
export async function POST(request: NextRequest) {
  try {
    // Check for cron secret to ensure only authorized calls
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'change-me-in-production'
    
    // Vercel cron jobs don't send Authorization header, so we check for the cron secret in headers
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret')
    
    if (!authHeader && !vercelCronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (vercelCronSecret && vercelCronSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🔄 Starting background sync for all users...')

    // Get all users with sync settings enabled
    const usersWithAutoSync = await prisma.syncSettings.findMany({
      where: {
        autoSync: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    console.log(`📊 Found ${usersWithAutoSync.length} users with auto-sync enabled`)

    let totalSynced = 0
    let totalDeleted = 0
    let errors: string[] = []

    for (const syncSetting of usersWithAutoSync) {
      const userId = syncSetting.userId
      const user = syncSetting.user

      try {
        console.log(`🔄 Syncing for user: ${user.email}`)

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
            console.log(`  ⚠️ No valid ${provider} account for user ${user.email}`)
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
          if (orphanedFileIds.length > 0) {
            const deleteResult = await prisma.fileUpload.deleteMany({
              where: {
                id: { in: orphanedFileIds },
                portal: {
                  userId: userId
                }
              }
            })

            const deletedCount = deleteResult.count
            totalDeleted += deletedCount

            console.log(`    🗑️ Deleted ${deletedCount} orphaned files from ${provider}`)

            // Invalidate caches after deletion
            if (deletedCount > 0) {
              await Promise.all([
                invalidateCache(getUserDashboardKey(userId)),
                invalidateCache(getUserUploadsKey(userId)),
                invalidateCache(getUserStatsKey(userId))
              ])
            }
          }

          totalSynced += files.length
        }

      } catch (error) {
        const errorMsg = `Error syncing user ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`  ❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    console.log(`✅ Background sync completed`)
    console.log(`   Users processed: ${usersWithAutoSync.length}`)
    console.log(`   Files synced: ${totalSynced}`)
    console.log(`   Files deleted: ${totalDeleted}`)
    console.log(`   Errors: ${errors.length}`)

    return NextResponse.json({
      success: true,
      message: "Background sync completed",
      stats: {
        usersProcessed: usersWithAutoSync.length,
        filesSynced: totalSynced,
        filesDeleted: totalDeleted,
        errors: errors.length
      },
      errors: errors.slice(0, 10) // Limit error details in response
    })

  } catch (error) {
    console.error("Error in background sync:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}