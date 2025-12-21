import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { uploadToCloudStorage, StorageProvider } from "@/lib/storage"
import { sendUploadNotification } from "@/lib/email"
import { jwtVerify } from "jose"
import { invalidateCache, getUserDashboardKey } from "@/lib/cache"

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_PASSWORD_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-me"
)

// POST /api/upload - Handle file upload
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file = formData.get("file") as File | null
    const portalId = formData.get("portalId") as string | null
    const clientName = formData.get("clientName") as string | null
    const clientEmail = formData.get("clientEmail") as string | null
    const clientMessage = formData.get("clientMessage") as string | null
    const token = request.headers.get("Authorization")?.replace("Bearer ", "") || formData.get("token") as string | null

    // Validate required fields
    if (!file || !portalId) {
      return NextResponse.json({ error: "File and portal ID are required" }, { status: 400 })
    }

    // Get portal and validate (include user for storage access)
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

    // Verify password protection
    if (portal.passwordHash) {
      if (!token) {
        return NextResponse.json({ error: "Password verification required" }, { status: 401 })
      }

      try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        if (payload.portalId !== portalId) {
          return NextResponse.json({ error: "Invalid token for this portal" }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
      }
    }

    // Validate required client info
    if (portal.requireClientName && !clientName) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 })
    }

    if (portal.requireClientEmail && !clientEmail) {
      return NextResponse.json({ error: "Client email is required" }, { status: 400 })
    }

    // Validate file size
    if (file.size > portal.maxFileSize) {
      return NextResponse.json({
        error: `File too large. Maximum size is ${(portal.maxFileSize / 1024 / 1024).toFixed(0)}MB`
      }, { status: 400 })
    }

    // Validate file type if restrictions are configured
    const mimeType = file.type || "application/octet-stream"
    if (portal.allowedFileTypes && portal.allowedFileTypes.length > 0) {
      const isAllowed = portal.allowedFileTypes.some((allowedType: string) => {
        if (allowedType.endsWith("/*")) {
          const mainType = allowedType.split("/")[0]
          return mimeType.startsWith(mainType + "/")
        }
        return mimeType === allowedType
      })

      if (!isAllowed) {
        return NextResponse.json({
          error: "This file type is not allowed for this portal"
        }, { status: 400 })
      }
    }

    // Get client info from request
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Read file into buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Security Scan
    const { scanFile } = await import("@/lib/scanner")
    const scanResult = await scanFile(buffer, file.name)

    if (scanResult.status === "infected") {
      console.warn(`Blocked upload of infected file: ${file.name} (${scanResult.threat})`)
      return NextResponse.json({ 
        error: "Security Alert: File rejected due to detected malware signature." 
      }, { status: 400 })
    }

    if (scanResult.status === "error") {
      // Fail open or closed? For high security, fail closed.
      console.error("File scan failed, rejecting upload")
      return NextResponse.json({ 
        error: "Security Check Failed: Unable to scan file. Please try again." 
      }, { status: 500 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const uniqueFileName = `${timestamp}-${safeFileName}`

    let storageProvider = portal.storageProvider as StorageProvider
    let storageFileId: string | undefined
    let storagePath: string | undefined
    let uploadSuccess = false

    // Determine folder path (optionally organize by client name)
    let targetFolderPath = portal.storageFolderPath || ""
    if (clientName && targetFolderPath) {
      // Create subfolder for client
      targetFolderPath = `${targetFolderPath}/${clientName.replace(/[^a-zA-Z0-9\s-]/g, "_")}`
    } else if (clientName) {
      targetFolderPath = clientName.replace(/[^a-zA-Z0-9\s-]/g, "_")
    }

    // Upload to cloud storage or local
    if (storageProvider !== "local") {
      // Upload to cloud storage
      const result = await uploadToCloudStorage(
        portal.userId,
        storageProvider,
        buffer,
        uniqueFileName,
        mimeType,
        portal.storageFolderId || undefined,
        targetFolderPath || undefined
      )

      if (result.success) {
        uploadSuccess = true
        storageFileId = result.fileId
        storagePath = result.webViewLink || targetFolderPath
      } else {
        // Fall back to local storage
        console.error("Cloud upload failed, falling back to local:", result.error)
        storageProvider = "local"
      }
    }

    // Local storage (either primary or fallback)
    if (storageProvider === "local") {
      const uploadsDir = path.join(process.cwd(), "uploads", portalId)
      await mkdir(uploadsDir, { recursive: true })
      const filePath = path.join(uploadsDir, uniqueFileName)
      await writeFile(filePath, buffer)
      uploadSuccess = true
      storagePath = filePath
    }

    if (!uploadSuccess) {
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Create file upload record
    const uploadedAt = new Date()
    const fileUpload = await prisma.fileUpload.create({
      data: {
        portalId,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        clientMessage: clientMessage || null,
        storageProvider,
        storageFileId: storageFileId || null,
        storagePath: storagePath || null,
        status: "uploaded",
        ipAddress: ipAddress.split(",")[0].trim(),
        userAgent: userAgent.substring(0, 500),
        uploadedAt,
      }
    })

    // Invalidate dashboard cache since new upload was created
    await invalidateCache(getUserDashboardKey(portal.userId))

    // Send email notification to portal owner (async, don't block response)
    if (portal.user.email) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      sendUploadNotification(portal.user.email, {
        portalName: portal.name,
        fileName: file.name,
        fileSize: file.size,
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
      uploadId: fileUpload.id,
      fileName: file.name,
      storageProvider,
    })
  } catch (error) {
    console.error("Error handling upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

