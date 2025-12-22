import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getStorageService, getValidAccessToken, StorageProvider } from "@/lib/storage"
import { jwtVerify } from "jose"
import { assertUploadAllowed } from "@/lib/billing"

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_PASSWORD_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-me"
)

// POST /api/upload/session - Initiate a resumable upload session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      portalId, 
      fileName, 
      fileSize, 
      mimeType, 
      clientName, 
      clientEmail,
      token 
    } = body

    // Validate required fields
    if (!portalId || !fileName || !fileSize || !mimeType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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
    if (fileSize > portal.maxFileSize) {
      return NextResponse.json({
        error: `File too large. Maximum size is ${(portal.maxFileSize / 1024 / 1024).toFixed(0)}MB`
      }, { status: 400 })
    }

    // Enforce billing upload limits
    try {
      await assertUploadAllowed(portal.userId, fileSize)
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Upload limit reached" }, { status: 403 })
    }

    // Validate file type
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

    // Determine storage provider
    const storageProvider = portal.storageProvider as StorageProvider

    // If local, we can't do resumable upload via this endpoint (yet), 
    // or we could implement a local chunked upload. 
    // For now, we'll only support Google Drive via this flow.
    if (storageProvider === "local") {
      return NextResponse.json({ 
        strategy: "local",
        message: "Use standard upload endpoint" 
      })
    }

    // Get storage service
    const service = getStorageService(storageProvider)
    if (!service || !service.createResumableUpload) {
      // Fallback to standard upload if provider doesn't support resumable
      return NextResponse.json({ 
        strategy: "proxy",
        message: "Use standard upload endpoint" 
      })
    }

    // Get access token
    const oauthProvider = storageProvider === "google_drive" ? "google" : "dropbox"
    const tokenResult = await getValidAccessToken(portal.userId, oauthProvider)

    if (!tokenResult) {
      return NextResponse.json({ error: "Storage account not connected or expired" }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const uniqueFileName = `${timestamp}-${safeFileName}`

    // Determine folder path
    let targetFolderPath = portal.storageFolderPath || ""
    if (clientName && targetFolderPath) {
      targetFolderPath = `${targetFolderPath}/${clientName.replace(/[^a-zA-Z0-9\s-]/g, "_")}`
    } else if (clientName) {
      targetFolderPath = clientName.replace(/[^a-zA-Z0-9\s-]/g, "_")
    }

    // Initiate resumable upload
    const { uploadUrl, fileId } = await service.createResumableUpload(
      tokenResult.accessToken,
      uniqueFileName,
      mimeType,
      portal.storageFolderId || undefined,
      targetFolderPath || undefined
    )

    return NextResponse.json({
      strategy: "resumable",
      uploadUrl,
      fileId, // Might be undefined for Google Drive until upload completes, but useful if available
      uniqueFileName,
      storageProvider
    })

  } catch (error) {
    console.error("Error creating upload session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
