import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { downloadFromCloudStorage, getValidAccessToken } from "@/lib/storage"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey } from "@/lib/cache"
import { getDownloadRules } from "@/lib/storage/file-binding"
import { StorageAccountStatus } from "@prisma/client"

// GET /api/uploads/[id]/download - Download a file
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

    // STORAGE ACCOUNT VALIDATION - Check if file can be downloaded
    const downloadRules = getDownloadRules(
      upload.storageAccountId,
      upload.storageAccount?.status as StorageAccountStatus || null
    )

    if (!downloadRules.canDownload) {
      // Provide specific error messages based on storage account status
      if (upload.storageAccount?.status === StorageAccountStatus.DISCONNECTED) {
        return NextResponse.json({
          error: "Storage account disconnected",
          details: `Your ${upload.storageAccount.provider} account (${upload.storageAccount.email}) needs to be reconnected to access this file.`,
          requiresReconnection: true
        }, { status: 403 })
      } else if (upload.storageAccount?.status === StorageAccountStatus.ERROR) {
        return NextResponse.json({
          error: "Storage account error",
          details: "There are temporary connection issues with your storage account. Please try again later.",
          isTemporary: true
        }, { status: 503 })
      } else {
        return NextResponse.json({
          error: "File access denied",
          details: downloadRules.reason || "Unable to access this file at this time."
        }, { status: 403 })
      }
    }

    if (upload.storageProvider === "google_drive" || upload.storageProvider === "dropbox") {
      let storageId = upload.storageFileId || (upload.storagePath && !upload.storagePath.startsWith("http") ? upload.storagePath : "");

      // Determine which provider to use for token retrieval
      let providerForToken: "google" | "dropbox"
      if (upload.storageAccountId && upload.storageAccount) {
        // Use file's bound storage account provider
        providerForToken = upload.storageAccount.provider === "google_drive" ? "google" : "dropbox"
      } else {
        // Legacy file: use provider from storageProvider field
        providerForToken = upload.storageProvider === "google_drive" ? "google" : "dropbox"
      }

      // Recovery logic for Google Drive if ID is missing (common in old or failed resumable uploads)
      if (!storageId && upload.storageProvider === "google_drive" && upload.storagePath) {
        const { googleDriveService } = await import("@/lib/storage/google-drive");
        const tokenResult = await getValidAccessToken(session.user.id, "google");
        if (tokenResult) {
          const foundId = await googleDriveService.findFileByName(tokenResult.accessToken, upload.storagePath);
          if (foundId) {
            storageId = foundId;
            // Update the DB so we don't have to search again
              await prisma.fileUpload.update({
                where: { id: upload.id },
                data: { storageFileId: foundId }
              });
              // Invalidate caches since upload metadata changed
              await Promise.all([
                invalidateCache(getUserDashboardKey(session.user.id)),
                invalidateCache(getUserUploadsKey(session.user.id)),
                invalidateCache(getUserStatsKey(session.user.id))
              ]);
          }
        }
      }

      const fileData = await downloadFromCloudStorage(
        session.user.id,
        upload.storageProvider,
        storageId || ""
      ).catch(async (err: any) => {
        console.error("Download failed:", err)
        
        // Check if this is a "file not found" error (cascade deletion trigger)
        const isFileNotFound = err.message?.includes('404') || 
                              err.message?.includes('not found') || 
                              err.message?.includes('not_found') ||
                              err.message?.includes('path_not_found') ||
                              err.message?.includes('File not found')
        
        if (isFileNotFound) {
          console.log(`🗑️ File ${upload.fileName} not found in ${upload.storageProvider}, triggering cascade deletion`)
          
          try {
            // CASCADE DELETE: Remove from database since file doesn't exist in cloud storage
            await prisma.fileUpload.delete({
              where: { id: upload.id }
            })
            
            // Invalidate caches
            if (session.user?.id) {
              await Promise.all([
                invalidateCache(getUserDashboardKey(session.user.id)),
                invalidateCache(getUserUploadsKey(session.user.id)),
                invalidateCache(getUserStatsKey(session.user.id))
              ])
            }
            
            console.log(`✅ Cascade deletion completed for file ${upload.fileName}`)
            
            // Throw a special error to indicate cascade deletion occurred
            const cascadeError = new Error("This file was deleted from your cloud storage and has been automatically removed from the app.")
            ;(cascadeError as any).cascadeDeleted = true
            throw cascadeError
            
          } catch (deleteErr) {
            console.error("Failed to cascade delete file:", deleteErr)
            // Fall through to normal error handling
          }
        }
        
        // If not a file-not-found error, mark storage account as ERROR
        if (!isFileNotFound && upload.storageAccountId && upload.storageAccount) {
          prisma.storageAccount.update({
            where: { id: upload.storageAccountId },
            data: { 
              status: StorageAccountStatus.ERROR,
              lastError: err.message || "Download failed",
              updatedAt: new Date()
            }
          }).catch(updateErr => {
            console.error("Failed to update storage account status:", updateErr)
          })
        }
        
        throw err // Re-throw the original error
      })

      if (!fileData) {
        return NextResponse.json({
          error: "Failed to download file from cloud storage",
          details: "File could not be accessed from cloud storage."
        }, { status: 500 })
      }

      // Update storage account last accessed time on successful download
      if (upload.storageAccountId) {
        prisma.storageAccount.update({
          where: { id: upload.storageAccountId },
          data: { lastAccessedAt: new Date() }
        }).catch(err => {
          console.error("Failed to update lastAccessedAt:", err)
        })
      }

      // Return the file as a stream
      return new NextResponse(fileData.data as any, {
        headers: {
          "Content-Type": fileData.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileData.fileName || upload.fileName}"`,
        },
      })
    }

    return NextResponse.json({ error: "Unknown storage provider" }, { status: 500 })
  } catch (error: any) {
    console.error("Error downloading file:", error)
    
    // Handle cascade deletion
    if (error.cascadeDeleted) {
      return NextResponse.json({
        error: "File no longer exists",
        details: error.message,
        cascadeDeleted: true
      }, { status: 410 }) // 410 Gone - resource no longer exists
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

