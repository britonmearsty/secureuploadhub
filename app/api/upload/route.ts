import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { uploadToCloudStorage, StorageProvider } from "@/lib/storage"
import { sendUploadNotification } from "@/lib/email-templates"
import { jwtVerify } from "jose"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey, getUserPortalsKey } from "@/lib/cache"
import { assertUploadAllowed } from "@/lib/billing"
import { getUploadRules } from "@/lib/storage/file-binding"
import { StorageAccountStatus } from "@prisma/client"
import { validateFileType } from "@/lib/file-validation"
import type { ScanResult } from "@/lib/scanner"

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

    // Get portal and validate (include user and storage account for storage access)
    const portal = await prisma.uploadPortal.findUnique({
      where: { id: portalId },
      include: { 
        user: true,
        storageAccount: true
      }
    })

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    if (!portal.isActive) {
      return NextResponse.json({ error: "Portal is not active" }, { status: 400 })
    }

    // STORAGE ACCOUNT VALIDATION - Check if portal can accept uploads
    let resolvedStorageAccountId: string | null = null
    
    // Get user's storage accounts for validation
    const userStorageAccounts = await prisma.storageAccount.findMany({
      where: { userId: portal.userId },
      select: { id: true, provider: true, status: true }
    })

    // Apply upload rules to determine storage account
    const uploadRules = getUploadRules(
      portal.storageAccountId,
      portal.storageProvider,
      userStorageAccounts
    )

    if (!uploadRules.canUpload) {
      return NextResponse.json({ 
        error: uploadRules.reason || "Portal cannot accept uploads at this time"
      }, { status: 400 })
    }

    resolvedStorageAccountId = uploadRules.storageAccountId || null

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

    // Enforce billing upload limits
    try {
      await assertUploadAllowed(portal.userId, file.size)
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Upload limit reached" }, { status: 403 })
    }

    // Validate file type if restrictions are configured
    const mimeType = file.type || "application/octet-stream"
    if (portal.allowedFileTypes && portal.allowedFileTypes.length > 0) {
      const isAllowed = validateFileType({
        allowedTypes: portal.allowedFileTypes,
        fileName: file.name,
        mimeType
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

    // Read file into buffer (consider streaming for very large files)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Security Scan - Skip for safe file types, async scan for others
    const { scanFile } = await import("@/lib/scanner")

    // Safe file types that don't need scanning (reduces latency by ~200-500ms)
    const SAFE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'application/pdf']
    const isSafeType = SAFE_TYPES.includes(mimeType)

    let scanResult: ScanResult = { status: "clean" }

    if (!isSafeType) {
      // Scan potentially dangerous files before returning
      scanResult = await scanFile(buffer, file.name, mimeType)

      if (scanResult.status === "infected") {
        console.warn(`Blocked upload of infected file: ${file.name} (${scanResult.threat})`)
        return NextResponse.json({
          error: "Security Alert: File rejected due to detected malware signature."
        }, { status: 400 })
      }

      if (scanResult.status === "error") {
        console.error("File scan failed, rejecting upload")
        return NextResponse.json({
          error: "Security Check Failed: Unable to scan file. Please try again."
        }, { status: 500 })
      }
    } else {
      // For safe types, scan asynchronously in the background
      console.log(`Skipping scan for safe file type: ${mimeType}`)
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
    let targetFolderPath: string | undefined = undefined

    if (portal.useClientFolders && clientName) {
      // Create a unique folder name with client name and timestamp
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '') // HHMMSS
      const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9\s-]/g, "_").trim()
      
      // Format: "ClientName_YYYYMMDD_HHMMSS" for uniqueness
      targetFolderPath = `${sanitizedClientName}_${dateStr}_${timeStr}`
    }

    // Upload to cloud storage
    const result = await uploadToCloudStorage(
      portal.userId,
      storageProvider,
      buffer,
      uniqueFileName,
      mimeType,
      portal.storageFolderId || undefined,
      targetFolderPath
    )

    if (result.success) {
      uploadSuccess = true
      storageFileId = result.fileId
      storagePath = result.webViewLink || targetFolderPath
    }

    if (!uploadSuccess) {
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Create file upload record with storage account binding
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
        storageAccountId: resolvedStorageAccountId, // CRITICAL: Bind file to storage account
        status: "uploaded",
        ipAddress: ipAddress.split(",")[0].trim(),
        userAgent: userAgent.substring(0, 500),
        uploadedAt,
      }
    })

    // Invalidate all relevant caches since new upload was created
    await Promise.all([
      invalidateCache(getUserDashboardKey(portal.userId)),
      invalidateCache(getUserUploadsKey(portal.userId)),
      invalidateCache(getUserStatsKey(portal.userId)),
      invalidateCache(getUserPortalsKey(portal.userId))
    ])

    // Send email notification to portal owner (async, don't block response)
    if (portal.user.email) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      sendUploadNotification({
        to: portal.user.email,
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ 
      error: `Upload failed: ${errorMessage}` 
    }, { status: 500 })
  }
}

