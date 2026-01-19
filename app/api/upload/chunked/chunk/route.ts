import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// POST /api/upload/chunked/chunk - Upload a single chunk
export async function POST(request: NextRequest) {
  const chunkStartTime = Date.now()
  
  try {
    // Log request details for debugging
    const contentLength = request.headers.get('content-length')
    console.log(`📦 CHUNK_UPLOAD: Received request with content-length: ${contentLength}`)
    
    let formData
    try {
      formData = await request.formData()
    } catch (formDataError) {
      console.error(`❌ CHUNK_UPLOAD: Failed to parse form data:`, formDataError)
      return NextResponse.json({ 
        error: "Failed to parse form data", 
        details: formDataError instanceof Error ? formDataError.message : 'Unknown error'
      }, { status: 400 })
    }
    
    const uploadId = formData.get("uploadId") as string
    const chunkIndex = parseInt(formData.get("chunkIndex") as string)
    const totalChunks = parseInt(formData.get("totalChunks") as string)
    const chunk = formData.get("chunk") as File

    console.log(`📦 CHUNK_UPLOAD: Processing chunk ${chunkIndex}/${totalChunks} for upload ${uploadId}, chunk size: ${chunk?.size || 'unknown'} bytes`)

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !chunk) {
      console.error(`❌ CHUNK_UPLOAD: Missing fields - uploadId: ${!!uploadId}, chunkIndex: ${chunkIndex}, totalChunks: ${totalChunks}, chunk: ${!!chunk}`)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate chunk size
    if (chunk.size > 5 * 1024 * 1024) { // 5MB safety limit
      console.error(`❌ CHUNK_UPLOAD: Chunk too large: ${chunk.size} bytes`)
      return NextResponse.json({ error: "Chunk too large" }, { status: 413 })
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

    // Store chunk data in database instead of filesystem
    // This ensures chunks are available across different Vercel serverless instances
    const buffer = await chunk.arrayBuffer()
    const chunkData = Buffer.from(buffer)

    // Store chunk in database
    await prisma.chunkData.create({
      data: {
        uploadId,
        chunkIndex,
        data: chunkData,
        size: chunk.size,
      },
    })

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