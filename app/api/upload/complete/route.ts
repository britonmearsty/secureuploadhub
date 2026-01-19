import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { sendUploadNotification } from "@/lib/email"
import { 
  addFileToBatch, 
  sendBatchUploadNotification 
} from "@/lib/upload-batch-tracker"
import { jwtVerify } from "jose"
import { revalidatePath } from "next/cache"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey, getUserPortalsKey } from "@/lib/cache"

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_PASSWORD_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-me"
)

// POST /api/upload/complete - Finalize a resumable upload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      portalId,
      fileName,
      uniqueFileName,
      fileSize,
      mimeType,
      clientName,
      clientEmail,
      clientMessage,
      storageProvider,
      token,
      batchId, // New: batch tracking
      // Optional: fileId if available from client (e.g. Dropbox)
      fileId
    } = body

    // Validate required fields
    if (!portalId || !fileName || !fileSize || !mimeType || !storageProvider) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get portal
    const portal = await prisma.uploadPortal.findUnique({
      where: { id: portalId },
      include: { user: true }
    })

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    // Verify password protection (re-verify to be safe)
    if (portal.passwordHash) {
      if (!token) {
        return NextResponse.json({ error: "Password verification required" }, { status: 401 })
      }
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        if (payload.portalId !== portalId) {
          return NextResponse.json({ error: "Invalid token" }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
    }

    // Get client info from request
    const ipAddress = request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Note: Billing limits were already checked in /api/upload/session
    // The file has already been uploaded to cloud storage at this point,
    // so we just need to record it in the database

    // Create file upload record
    const uploadedAt = new Date()
    const fileUpload = await prisma.fileUpload.create({
      data: {
        portalId,
        fileName: fileName, // Original name
        fileSize: fileSize,
        mimeType,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        clientMessage: clientMessage || null,
        storageProvider,
        storageFileId: fileId || null, // Might be null for Google Drive if we don't have it yet
        storagePath: uniqueFileName, // We store the unique name we generated
        status: "uploaded",
        ipAddress: ipAddress.split(",")[0].trim(),
        userAgent: userAgent.substring(0, 500),
        uploadedAt,
      }
    })

    // Send email notification
    if (portal.user.email) {
      console.log(`📧 COMPLETE_EMAIL_NOTIFICATION: Processing notification for ${portal.user.email}`)

      // Check if this upload is part of a batch
      if (batchId) {
        console.log(`📦 COMPLETE_BATCH_CHECK: Adding to batch ${batchId}`)
        
        // Add file to batch and check if batch is complete
        const batchResult = await addFileToBatch(batchId, fileUpload.id, fileName, fileSize)
        
        if (batchResult.isComplete && batchResult.session) {
          // Send batch notification instead of individual notification
          console.log(`📧 COMPLETE_BATCH_COMPLETE: Sending batch notification for ${batchId}`)
          sendBatchUploadNotification(batchResult.session).catch((err) => {
            console.error(`❌ COMPLETE_BATCH_EMAIL_ERROR: Failed to send batch notification:`, err)
          })
        } else {
          console.log(`📦 COMPLETE_BATCH_PENDING: Batch ${batchId} not yet complete`)
        }
      } else {
        // Send individual notification (legacy behavior)
        console.log(`📧 COMPLETE_INDIVIDUAL_NOTIFICATION: Sending individual notification`)
        
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        sendUploadNotification(portal.user.email, {
          portalName: portal.name,
          fileName: fileName,
          fileSize: fileSize,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
          clientMessage: clientMessage || undefined,
          uploadedAt,
          portalUrl: `${baseUrl}/p/${portal.slug}`,
          dashboardUrl: `${baseUrl}/dashboard`,
        }).catch((err) => {
          console.error("Failed to send upload notification:", err)
        })
      }
    }

    // Invalidate all relevant caches for this user
    const userId = portal.userId
    await Promise.all([
      invalidateCache(getUserDashboardKey(userId)),
      invalidateCache(getUserUploadsKey(userId)),
      invalidateCache(getUserStatsKey(userId)),
      invalidateCache(getUserPortalsKey(userId))
    ])

    // Also revalidate dashboard paths
    revalidatePath("/dashboard")

    return NextResponse.json({
      success: true,
      uploadId: fileUpload.id
    })

  } catch (error) {
    console.error("Error completing upload process:")
    console.error("- Error:", error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error("- Stack:", error.stack)
    }

    return NextResponse.json({
      error: "Internal server error during finalization",
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}
