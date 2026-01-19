import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createBatchUploadSession } from "@/lib/upload-batch-tracker"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_PASSWORD_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-me"
)

// POST /api/upload/batch/init - Initialize a batch upload session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      portalId, 
      fileCount, 
      clientName, 
      clientEmail, 
      clientMessage, 
      token 
    } = body

    // Validate required fields
    if (!portalId || !fileCount || fileCount < 1) {
      return NextResponse.json({ 
        error: "Portal ID and file count are required" 
      }, { status: 400 })
    }

    // Get portal and validate
    const portal = await prisma.uploadPortal.findUnique({
      where: { id: portalId },
      include: { user: true }
    })

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    if (!portal.isActive) {
      return NextResponse.json({ error: "Portal is not active" }, { status: 400 })
    }

    // Verify password protection if required
    if (portal.passwordHash) {
      if (!token) {
        return NextResponse.json({ 
          error: "Password verification required" 
        }, { status: 401 })
      }

      try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        if (payload.portalId !== portalId) {
          return NextResponse.json({ 
            error: "Invalid token for this portal" 
          }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ 
          error: "Invalid or expired token" 
        }, { status: 401 })
      }
    }

    // Validate required client info
    if (portal.requireClientName && !clientName) {
      return NextResponse.json({ 
        error: "Client name is required" 
      }, { status: 400 })
    }

    if (portal.requireClientEmail && !clientEmail) {
      return NextResponse.json({ 
        error: "Client email is required" 
      }, { status: 400 })
    }

    // Create batch upload session
    const batchId = await createBatchUploadSession(
      portalId,
      fileCount,
      clientName || undefined,
      clientEmail || undefined,
      clientMessage || undefined
    )

    console.log(`📦 BATCH_INIT_SUCCESS: ${batchId} - Created for ${fileCount} files`)

    return NextResponse.json({
      success: true,
      batchId,
      portalId,
      fileCount,
      message: `Batch upload session created for ${fileCount} files`
    })

  } catch (error) {
    console.error("Error creating batch upload session:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({
      error: `Failed to create batch upload session: ${errorMessage}`
    }, { status: 500 })
  }
}