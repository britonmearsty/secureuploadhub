import { NextRequest, NextResponse } from "next/server"
import { getBatchUploadSession } from "@/lib/upload-batch-tracker"

// GET /api/upload/batch/status?batchId=xxx - Get batch upload status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const batchId = searchParams.get("batchId")

    if (!batchId) {
      return NextResponse.json({ 
        error: "Batch ID is required" 
      }, { status: 400 })
    }

    const session = await getBatchUploadSession(batchId)

    if (!session) {
      return NextResponse.json({ 
        error: "Batch session not found or expired" 
      }, { status: 404 })
    }

    const progress = {
      batchId: session.batchId,
      portalId: session.portalId,
      expectedFileCount: session.expectedFileCount,
      uploadedFileCount: session.uploadedFiles.length,
      isComplete: session.uploadedFiles.length >= session.expectedFileCount,
      progress: Math.round((session.uploadedFiles.length / session.expectedFileCount) * 100),
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    }

    return NextResponse.json({
      success: true,
      ...progress
    })

  } catch (error) {
    console.error("Error getting batch upload status:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({
      error: `Failed to get batch status: ${errorMessage}`
    }, { status: 500 })
  }
}