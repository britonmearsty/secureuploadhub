import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getValidAccessToken, getStorageService } from "@/lib/storage"
import { StorageAccountStatus } from "@prisma/client"

// POST /api/storage/cleanup - Clean up orphaned database records
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider, dryRun = true } = await request.json()

    if (!provider || !["google_drive", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    // Get user's files for this provider
    const files = await prisma.fileUpload.findMany({
      where: {
        storageProvider: provider,
        portal: {
          userId: session.user.id
        }
      },
      include: {
        storageAccount: {
          select: {
            status: true,
            provider: true
          }
        }
      }
    })

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No files found for ${provider}`,
        orphanedFiles: [],
        totalChecked: 0,
        deletedCount: 0
      })
    }

    // Check if storage account is connected
    const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
    const tokenResult = await getValidAccessToken(session.user.id, oauthProvider)

    if (!tokenResult) {
      return NextResponse.json({
        error: `No valid ${provider} account connected`,
        details: "Cannot perform cleanup without active storage connection"
      }, { status: 403 })
    }

    const service = getStorageService(provider)
    if (!service) {
      return NextResponse.json({ error: "Storage service not available" }, { status: 500 })
    }

    const orphanedFiles: Array<{
      id: string
      fileName: string
      storageFileId: string | null
      storagePath: string | null
      reason: string
    }> = []

    let checkedCount = 0
    let deletedCount = 0

    // Check each file to see if it still exists in cloud storage
    for (const file of files) {
      checkedCount++
      const storageId = file.storageFileId || file.storagePath

      if (!storageId) {
        orphanedFiles.push({
          id: file.id,
          fileName: file.fileName,
          storageFileId: file.storageFileId,
          storagePath: file.storagePath,
          reason: "Missing storage ID"
        })
        continue
      }

      try {
        // Try to get file metadata to check if it exists
        if (provider === "google_drive" && service.downloadFile) {
          // For Google Drive, try to get metadata
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${storageId}?fields=id,name`,
            {
              headers: {
                Authorization: `Bearer ${tokenResult.accessToken}`,
              },
            }
          )

          if (!response.ok) {
            if (response.status === 404) {
              orphanedFiles.push({
                id: file.id,
                fileName: file.fileName,
                storageFileId: file.storageFileId,
                storagePath: file.storagePath,
                reason: "File not found in Google Drive"
              })
            }
          }
        } else if (provider === "dropbox") {
          // For Dropbox, try to get metadata
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
              orphanedFiles.push({
                id: file.id,
                fileName: file.fileName,
                storageFileId: file.storageFileId,
                storagePath: file.storagePath,
                reason: "File not found in Dropbox"
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error checking file ${file.fileName}:`, error)
        // Don't mark as orphaned if we can't check due to API errors
      }
    }

    // If not a dry run, delete the orphaned records
    if (!dryRun && orphanedFiles.length > 0) {
      const fileIdsToDelete = orphanedFiles.map(f => f.id)
      
      const deleteResult = await prisma.fileUpload.deleteMany({
        where: {
          id: { in: fileIdsToDelete },
          portal: {
            userId: session.user.id // Extra safety check
          }
        }
      })

      deletedCount = deleteResult.count
    }

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? `Found ${orphanedFiles.length} orphaned files (dry run)`
        : `Cleaned up ${deletedCount} orphaned files`,
      orphanedFiles: orphanedFiles.map(f => ({
        id: f.id,
        fileName: f.fileName,
        reason: f.reason
      })),
      totalChecked: checkedCount,
      deletedCount,
      dryRun
    })

  } catch (error) {
    console.error("Error in storage cleanup:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}