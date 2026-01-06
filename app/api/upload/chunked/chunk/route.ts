import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import fs from "fs/promises"
import path from "path"
import os from "os"

// POST /api/upload/chunked/chunk - Upload a single chunk
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const uploadId = formData.get("uploadId") as string
    const chunkIndex = parseInt(formData.get("chunkIndex") as string)
    const totalChunks = parseInt(formData.get("totalChunks") as string)
    const chunk = formData.get("chunk") as File

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !chunk) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get chunked upload session
    const chunkedUpload = await prisma.chunkedUpload.findUnique({
      where: { id: uploadId },
      include: { portal: true },
    })

    if (!chunkedUpload) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 })
    }

    if (chunkedUpload.status !== "in_progress") {
      return NextResponse.json({ error: "Upload session is not active" }, { status: 400 })
    }

    // Store chunk temporarily in filesystem (using streams for efficiency)
    const tempDir = path.join(os.tmpdir(), "uploads", uploadId)
    await fs.mkdir(tempDir, { recursive: true })

    const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`)
    const buffer = await chunk.arrayBuffer()
    // Write efficiently without creating intermediate buffers
    await fs.writeFile(chunkPath, new Uint8Array(buffer))

    // Update uploaded chunks count
    await prisma.chunkedUpload.update({
      where: { id: uploadId },
      data: { uploadedChunks: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      chunkIndex,
      uploadedChunks: chunkedUpload.uploadedChunks + 1,
      totalChunks,
    })
  } catch (error) {
    console.error("Error uploading chunk:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ 
      error: `Chunk upload failed: ${errorMessage}` 
    }, { status: 500 })
  }
}
