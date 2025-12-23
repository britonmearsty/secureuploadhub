import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

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
      if (upload.storagePath && upload.storagePath.startsWith("http")) {
        return NextResponse.redirect(upload.storagePath)
      }

      return NextResponse.json({
        message: "File is stored in cloud storage",
        provider: upload.storageProvider,
        fileId: upload.storageFileId,
        fileName: upload.fileName,
      })
    }

    return NextResponse.json({ error: "Unknown storage provider" }, { status: 500 })
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

