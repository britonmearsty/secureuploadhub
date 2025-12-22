import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { sendUploadNotification } from "@/lib/email"
import { jwtVerify } from "jose"
import { assertUploadAllowed } from "@/lib/billing"

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

    // Enforce billing upload limits
    try {
      await assertUploadAllowed(portal.userId, fileSize)
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Upload limit reached" }, { status: 403 })
    }

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

    return NextResponse.json({
      success: true,
      uploadId: fileUpload.id
    })

  } catch (error) {
    console.error("Error completing upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
