import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createReadStream, statSync, existsSync } from "fs"
import crypto from "crypto"

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

    if (upload.storageProvider === "local") {
      if (!upload.storagePath || !existsSync(upload.storagePath)) {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
      }

      const fileStats = statSync(upload.storagePath)
      const fileSize = fileStats.size
      const lastModified = fileStats.mtime.toUTCString()
      const etag = crypto.createHash("md5").update(`${upload.id}-${fileStats.mtimeMs}`).digest("hex")

      const rangeHeader = request.headers.get("range")
      let statusCode = 200
      const headers: Record<string, string> = {
        "Content-Type": upload.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(upload.fileName)}"`,
        "Cache-Control": "public, max-age=3600",
        "ETag": `"${etag}"`,
        "Last-Modified": lastModified,
        "Accept-Ranges": "bytes",
      }

      if (rangeHeader) {
        const ranges = rangeHeader.match(/bytes=(\d+)-(\d*)/)?.[0]
        if (ranges) {
          const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-")
          const start = parseInt(startStr, 10)
          const end = endStr ? parseInt(endStr, 10) : fileSize - 1

          if (start < fileSize && start <= end) {
            statusCode = 206
            headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`
            headers["Content-Length"] = (end - start + 1).toString()

            const stream = createReadStream(upload.storagePath, { start, end })
            const webStream = new ReadableStream({
              start(controller) {
                stream.on('data', (chunk) => controller.enqueue(chunk as Uint8Array));
                stream.on('end', () => controller.close());
                stream.on('error', (err) => controller.error(err));
              }
            });
            return new NextResponse(webStream, {
              status: statusCode,
              headers,
            })
          }
        }
      }

      headers["Content-Length"] = fileSize.toString()
      const stream = createReadStream(upload.storagePath)
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk as Uint8Array));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        }
      });
      return new NextResponse(webStream, {
        status: statusCode,
        headers,
      })
    } else if (upload.storageProvider === "google_drive" || upload.storageProvider === "dropbox") {
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

