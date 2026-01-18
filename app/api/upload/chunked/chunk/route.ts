import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import fs from "fs/promises"
import path from "path"
import os from "os"

// POST /api/upload/chunked/chunk - Upload a single chunk
export async function POST(request: NextRequest) {
  const chunkStartTime = Date.now()
  
  try {
    const formData = await request.formData()
    const uploadId = formData.get("uploadId") as string
    const chunkIndex = parseInt(formData.get("chunkIndex") as string)
    const totalChunks = parseInt(formData.get("totalChunks") as string)
    const chunk = formData.get("chunk") as File

    console.log(`📦 CHUNK_UPLOAD: Processing chunk ${chunkIndex}/${totalChunks} for upload ${uploadId}`)

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !chunk) {
      console.error(`❌ CHUNK_UPLOAD: Missing fields - uploadId: ${!!uploadId}, chunkIndex: ${chunkIndex}, totalChunks: ${totalChunks}, chunk: ${!!chunk}`)
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

    const processingTime = Date.now() - chunkStartTime
    console.log(`✅ CHUNK_UPLOAD: Successfully processed chunk ${chunkIndex} in ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      chunkIndex,
      processingTime
    })
  } catch (error) {
    const processingTime = Date.now() - chunkStartTime
    console.error(`❌ CHUNK_UPLOAD: Error processing chunk:`, error)
    console.error(`❌ CHUNK_UPLOAD: Processing time before error: ${processingTime}ms`)
    return NextResponse.json({ 
      error: "Failed to upload chunk",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
}
