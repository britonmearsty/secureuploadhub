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
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    console.log(`🔄 UPLOAD_START: ${uploadId} - Processing upload request`)

    const formData = await request.formData()

    const file = formData.get("file") as File | null
    const portalId = formData.get("portalId") as string | null
    const clientName = formData.get("clientName") as string | null
    const clientEmail = formData.get("clientEmail") as string | null
    const clientMessage = formData.get("clientMessage") as string | null
    const token = request.headers.get("Authorization")?.replace("Bearer ", "") || formData.get("token") as string | null

    console.log(`📋 UPLOAD_PARAMS: ${uploadId}`, {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileMimeType: file?.type,
      portalId,
      hasClientName: !!clientName,
      hasClientEmail: !!clientEmail,
      hasClientMessage: !!clientMessage,
      hasToken: !!token,
      userAgent: request.headers.get("user-agent")?.substring(0, 100),
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"
    })

    // Validate required fields
    if (!file || !portalId) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - Missing required fields`, {
        hasFile: !!file,
        hasPortalId: !!portalId
      })
      return NextResponse.json({ error: "File and portal ID are required" }, { status: 400 })
    }

    // Get portal and validate (include user and storage account for storage access)
    console.log(`🔍 UPLOAD_PORTAL_LOOKUP: ${uploadId} - Looking up portal ${portalId}`)

    const portal = await prisma.uploadPortal.findUnique({
      where: { id: portalId },
      include: {
        user: true,
        storageAccount: true
      }
    })

    if (!portal) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - Portal not found`, { portalId })
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    console.log(`✅ UPLOAD_PORTAL_FOUND: ${uploadId}`, {
      portalName: portal.name,
      portalSlug: portal.slug,
      isActive: portal.isActive,
      userId: portal.userId,
      userEmail: portal.user.email,
      hasStorageAccount: !!portal.storageAccount,
      storageProvider: portal.storageProvider,
      maxFileSize: portal.maxFileSize,
      allowedFileTypes: portal.allowedFileTypes?.length || 0,
      requireClientName: portal.requireClientName,
      requireClientEmail: portal.requireClientEmail,
      hasPasswordHash: !!portal.passwordHash
    })

    if (!portal.isActive) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - Portal is not active`, { portalId, portalName: portal.name })
      return NextResponse.json({ error: "Portal is not active" }, { status: 400 })
    }

    // STORAGE ACCOUNT VALIDATION - Check if portal can accept uploads
    console.log(`🔍 UPLOAD_STORAGE_VALIDATION: ${uploadId} - Validating storage accounts`)

    let resolvedStorageAccountId: string | null = null

    // Get user's storage accounts for validation
    const userStorageAccounts = await prisma.storageAccount.findMany({
      where: { userId: portal.userId },
      select: { id: true, provider: true, status: true }
    })

    console.log(`📊 UPLOAD_USER_STORAGE: ${uploadId}`, {
      userId: portal.userId,
      storageAccountCount: userStorageAccounts.length,
      accounts: userStorageAccounts.map(acc => ({
        id: acc.id,
        provider: acc.provider,
        status: acc.status
      }))
    })

    // Apply upload rules to determine storage account
    const uploadRules = getUploadRules(
      portal.storageAccountId,
      portal.storageProvider,
      userStorageAccounts
    )

    console.log(`📋 UPLOAD_RULES: ${uploadId}`, {
      canUpload: uploadRules.canUpload,
      reason: uploadRules.reason,
      storageAccountId: uploadRules.storageAccountId,
      portalStorageAccountId: portal.storageAccountId,
      portalStorageProvider: portal.storageProvider
    })

    if (!uploadRules.canUpload) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - Upload rules validation failed`, {
        reason: uploadRules.reason,
        portalStorageProvider: portal.storageProvider,
        userStorageAccounts: userStorageAccounts.length
      })
      return NextResponse.json({
        error: uploadRules.reason || "Portal cannot accept uploads at this time"
      }, { status: 400 })
    }

    resolvedStorageAccountId = uploadRules.storageAccountId || null
    console.log(`✅ UPLOAD_STORAGE_RESOLVED: ${uploadId}`, { resolvedStorageAccountId })

    // Verify password protection
    if (portal.passwordHash) {
      console.log(`🔐 UPLOAD_PASSWORD_CHECK: ${uploadId} - Portal requires password`)

      if (!token) {
        console.log(`❌ UPLOAD_ERROR: ${uploadId} - Password required but no token provided`)
        return NextResponse.json({ error: "Password verification required" }, { status: 401 })
      }

      try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        if (payload.portalId !== portalId) {
          console.log(`❌ UPLOAD_ERROR: ${uploadId} - Token portal mismatch`, {
            tokenPortalId: payload.portalId,
            requestPortalId: portalId
          })
          return NextResponse.json({ error: "Invalid token for this portal" }, { status: 403 })
        }
        console.log(`✅ UPLOAD_PASSWORD_VERIFIED: ${uploadId}`)
      } catch (tokenError) {
        console.log(`❌ UPLOAD_ERROR: ${uploadId} - Token verification failed`, {
          error: tokenError instanceof Error ? tokenError.message : 'Unknown token error'
        })
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
      }
    }

    // Validate required client info
    if (portal.requireClientName && !clientName) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - Client name required but not provided`)
      return NextResponse.json({ error: "Client name is required" }, { status: 400 })
    }

    if (portal.requireClientEmail && !clientEmail) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - Client email required but not provided`)
      return NextResponse.json({ error: "Client email is required" }, { status: 400 })
    }

    // Validate file size
    if (file.size > portal.maxFileSize) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - File too large`, {
        fileSize: file.size,
        maxFileSize: portal.maxFileSize,
        fileName: file.name
      })
      return NextResponse.json({
        error: `File too large. Maximum size is ${(portal.maxFileSize / 1024 / 1024).toFixed(0)}MB`
      }, { status: 400 })
    }

    // Enforce billing upload limits
    console.log(`💳 UPLOAD_BILLING_CHECK: ${uploadId} - Checking billing limits`)

    try {
      await assertUploadAllowed(portal.userId, file.size)
      console.log(`✅ UPLOAD_BILLING_OK: ${uploadId}`)
    } catch (err: any) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - Billing limit exceeded`, {
        userId: portal.userId,
        fileSize: file.size,
        error: err.message
      })
      return NextResponse.json({ error: err.message || "Upload limit reached" }, { status: 403 })
    }

    // Validate file type if restrictions are configured
    const mimeType = file.type || "application/octet-stream"
    console.log(`🔍 UPLOAD_FILE_TYPE_CHECK: ${uploadId}`, {
      fileName: file.name,
      mimeType,
      allowedTypes: portal.allowedFileTypes,
      hasRestrictions: !!(portal.allowedFileTypes && portal.allowedFileTypes.length > 0)
    })

    if (portal.allowedFileTypes && portal.allowedFileTypes.length > 0) {
      const isAllowed = validateFileType({
        allowedTypes: portal.allowedFileTypes,
        fileName: file.name,
        mimeType
      })

      if (!isAllowed) {
        console.log(`❌ UPLOAD_ERROR: ${uploadId} - File type not allowed`, {
          fileName: file.name,
          mimeType,
          allowedTypes: portal.allowedFileTypes
        })
        return NextResponse.json({
          error: "This file type is not allowed for this portal"
        }, { status: 400 })
      }

      console.log(`✅ UPLOAD_FILE_TYPE_OK: ${uploadId}`)
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
    console.log(`🛡️ UPLOAD_SECURITY_SCAN: ${uploadId} - Starting security scan`)

    const { scanFile } = await import("@/lib/scanner")

    // Safe file types that don't need scanning (reduces latency by ~200-500ms)
    const SAFE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'application/pdf']
    const isSafeType = SAFE_TYPES.includes(mimeType)

    console.log(`🔍 UPLOAD_SCAN_TYPE: ${uploadId}`, {
      mimeType,
      isSafeType,
      scanRequired: !isSafeType
    })

    let scanResult: ScanResult = { status: "clean" }

    if (!isSafeType) {
      // Scan potentially dangerous files before returning
      console.log(`🔍 UPLOAD_SCANNING: ${uploadId} - Scanning potentially dangerous file`)

      try {
        scanResult = await scanFile(buffer, file.name, mimeType)

        console.log(`📊 UPLOAD_SCAN_RESULT: ${uploadId}`, {
          status: scanResult.status,
          ...(scanResult.status === "infected" && { threat: (scanResult as any).threat }),
          fileName: file.name
        })

        if (scanResult.status === "infected") {
          console.log(`❌ UPLOAD_ERROR: ${uploadId} - Malware detected`, {
            fileName: file.name,
            threat: (scanResult as any).threat
          })
          return NextResponse.json({
            error: "Security Alert: File rejected due to detected malware signature."
          }, { status: 400 })
        }

        if (scanResult.status === "error") {
          console.log(`❌ UPLOAD_ERROR: ${uploadId} - Scan failed`, {
            fileName: file.name,
            scanError: (scanResult as any).message
          })
          return NextResponse.json({
            error: "Security Check Failed: Unable to scan file. Please try again."
          }, { status: 500 })
        }

        console.log(`✅ UPLOAD_SCAN_CLEAN: ${uploadId}`)
      } catch (scanError) {
        console.log(`❌ UPLOAD_ERROR: ${uploadId} - Scan exception`, {
          fileName: file.name,
          error: scanError instanceof Error ? scanError.message : 'Unknown scan error'
        })
        return NextResponse.json({
          error: "Security Check Failed: Unable to scan file. Please try again."
        }, { status: 500 })
      }
    } else {
      // For safe types, scan asynchronously in the background
      console.log(`✅ UPLOAD_SCAN_SKIPPED: ${uploadId} - Safe file type, skipping scan`)
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
    console.log(`☁️ UPLOAD_CLOUD_START: ${uploadId} - Uploading to ${storageProvider}`, {
      fileName: uniqueFileName,
      fileSize: file.size,
      mimeType,
      targetFolderPath,
      storageFolderId: portal.storageFolderId
    })

    const result = await uploadToCloudStorage(
      portal.userId,
      storageProvider,
      buffer,
      uniqueFileName,
      mimeType,
      portal.storageFolderId || undefined,
      targetFolderPath
    )

    console.log(`📊 UPLOAD_CLOUD_RESULT: ${uploadId}`, {
      success: result.success,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
      error: result.error
    })

    if (result.success) {
      uploadSuccess = true
      storageFileId = result.fileId
      storagePath = result.webViewLink || result.filePath || targetFolderPath
    }

    if (!uploadSuccess) {
      console.log(`❌ UPLOAD_ERROR: ${uploadId} - Cloud storage upload failed`, {
        storageProvider,
        error: result.error
      })
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    console.log(`✅ UPLOAD_CLOUD_SUCCESS: ${uploadId}`, {
      storageFileId,
      storagePath
    })

    // Create file upload record with storage account binding
    console.log(`💾 UPLOAD_DB_SAVE: ${uploadId} - Saving upload record to database`)

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

    console.log(`✅ UPLOAD_DB_SAVED: ${uploadId}`, {
      fileUploadId: fileUpload.id,
      storageAccountId: resolvedStorageAccountId
    })

    // Invalidate all relevant caches since new upload was created
    console.log(`🗑️ UPLOAD_CACHE_INVALIDATE: ${uploadId} - Invalidating caches`)

    await Promise.all([
      invalidateCache(getUserDashboardKey(portal.userId)),
      invalidateCache(getUserUploadsKey(portal.userId)),
      invalidateCache(getUserStatsKey(portal.userId)),
      invalidateCache(getUserPortalsKey(portal.userId))
    ])

    // Send email notification to portal owner (async, don't block response)
    if (portal.user.email) {
      console.log(`📧 UPLOAD_EMAIL_NOTIFICATION: ${uploadId} - Sending notification to ${portal.user.email}`)

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
        console.error(`❌ UPLOAD_EMAIL_ERROR: ${uploadId} - Failed to send notification:`, err)
      })
    }

    console.log(`🎉 UPLOAD_SUCCESS: ${uploadId} - Upload completed successfully`, {
      fileUploadId: fileUpload.id,
      fileName: file.name,
      fileSize: file.size,
      storageProvider,
      processingTimeMs: Date.now() - parseInt(uploadId.split('_')[1])
    })

    return NextResponse.json({
      success: true,
      uploadId: fileUpload.id,
      fileName: file.name,
      storageProvider,
    })
  } catch (error) {
    console.error(`💥 UPLOAD_EXCEPTION: ${uploadId} - Unhandled error:`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name
    })

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({
      error: `Upload failed: ${errorMessage}`
    }, { status: 500 })
  }
}

