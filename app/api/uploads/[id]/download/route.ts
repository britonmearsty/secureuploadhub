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
      ).catch((err: any) => {
        console.error("Catch in API route:", err)
        
        // If download fails and file has storage account, mark account as ERROR
        if (upload.storageAccountId && upload.storageAccount) {
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
        
        return null
      })

      if (!fileData) {
        // Provide specific error messages based on context
        if (upload.storageAccountId && upload.storageAccount) {
          return NextResponse.json({
            error: "Failed to download file from cloud storage",
            details: `Unable to access file from your ${upload.storageAccount.provider} account. This may be due to expired tokens or the file being moved/deleted.`,
            storageAccount: upload.storageAccount.email,
            requiresReconnection: true
          }, { status: 500 })
        } else {
          return NextResponse.json({
            error: "Failed to download file from cloud storage",
            details: "Check server logs for more information. This usually means the cloud provider rejected the request (e.g. invalid file ID or expired token)."
          }, { status: 500 })
        }
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
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

