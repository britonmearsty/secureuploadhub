import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getPortalWithCache, getPortalWithUser } from "@/lib/portal-cache"
import { jwtVerify } from "jose"
import { assertUploadAllowed } from "@/lib/billing"
import crypto from "crypto"

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_PASSWORD_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-me"
)

// POST /api/upload/chunked/init - Initialize a chunked upload session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      portalId,
      fileName,
      fileSize,
      mimeType,
      totalChunks,
      clientName,
      clientEmail,
      clientMessage,
      token,
    } = body

    // Validate required fields
    if (!portalId || !fileName || !fileSize || !mimeType || !totalChunks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get portal (cached for faster lookups)
    const portalCache = await getPortalWithCache(portalId)
    if (!portalCache) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    // Get full portal with user for later use
    const portal = await getPortalWithUser(portalId)

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    if (!portalCache.isActive) {
      return NextResponse.json({ error: "Portal is not active" }, { status: 400 })
    }

    // Verify password protection
    if (portalCache.passwordHash) {
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
    if (portalCache.requireClientName && !clientName) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 })
    }

    if (portalCache.requireClientEmail && !clientEmail) {
      return NextResponse.json({ error: "Client email is required" }, { status: 400 })
    }

    // Validate file size
    if (fileSize > portalCache.maxFileSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${(portalCache.maxFileSize / 1024 / 1024).toFixed(0)}MB`,
        },
        { status: 400 }
      )
    }

    // Enforce billing limits
    try {
      await assertUploadAllowed(portalCache.userId, fileSize)
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Upload limit reached" }, { status: 403 })
    }

    // Validate file type
    if (portalCache.allowedFileTypes && portalCache.allowedFileTypes.length > 0) {
      const isAllowed = portalCache.allowedFileTypes.some((allowedType: string) => {
        if (allowedType.endsWith("/*")) {
          const mainType = allowedType.split("/")[0]
          return mimeType.startsWith(mainType + "/")
        }
        return mimeType === allowedType
      })

      if (!isAllowed) {
        return NextResponse.json(
          { error: "This file type is not allowed for this portal" },
          { status: 400 }
        )
      }
    }

    // Create chunked upload session in database
    const uploadId = crypto.randomUUID()
    const chunkedUpload = await prisma.chunkedUpload.create({
      data: {
        id: uploadId,
        portalId,
        fileName,
        fileSize,
        mimeType,
        totalChunks,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        clientMessage: clientMessage || null,
        uploadedChunks: 0,
        status: "in_progress",
      },
    })

    return NextResponse.json({
      uploadId: chunkedUpload.id,
      fileName: chunkedUpload.fileName,
      totalChunks: chunkedUpload.totalChunks,
    })
  } catch (error) {
    console.error("Error initializing chunked upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
