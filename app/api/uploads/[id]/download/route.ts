import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { downloadFromCloudStorage } from "@/lib/storage"

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
        }
      }
    })

    if (!upload) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    if (upload.portal.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (upload.storageProvider === "google_drive" || upload.storageProvider === "dropbox") {
      let storageId = upload.storageFileId || (upload.storagePath && !upload.storagePath.startsWith("http") ? upload.storagePath : "");

      // Recovery logic for Google Drive if ID is missing (common in old or failed resumable uploads)
      if (!storageId && upload.storageProvider === "google_drive" && upload.storagePath) {
        const { googleDriveService } = await import("@/lib/storage/google-drive");
        const { getValidAccessToken } = await import("@/lib/storage");
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
          }
        }
      }

      const fileData = await downloadFromCloudStorage(
        session.user.id,
        upload.storageProvider,
        storageId || ""
      ).catch((err: any) => {
        console.error("Catch in API route:", err)
        return null
      })

      if (!fileData) {
        return NextResponse.json({
          error: "Failed to download file from cloud storage",
          details: "Check server logs for more information. This usually means the cloud provider rejected the request (e.g. invalid file ID or expired token)."
        }, { status: 500 })
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

