import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { uploadToCloudStorage, StorageProvider } from "@/lib/storage"
import { sendUploadNotification } from "@/lib/email-templates"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey, getUserPortalsKey } from "@/lib/cache"
import { recordUploadMetrics, calculateMetrics } from "@/lib/upload-metrics"
import type { ScanResult } from "@/lib/scanner"
import { jwtVerify } from "jose"
import fs from "fs/promises"
import path from "path"
import os from "os"

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_PASSWORD_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-me"
)

// POST /api/upload/chunked/complete - Finalize a chunked upload
export async function POST(request: NextRequest) {
  const uploadStartTime = Date.now()
  
  try {
    const body = await request.json()
    const { uploadId, portalId, fileName, fileSize, mimeType, token } = body

    if (!uploadId || !portalId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get chunked upload session
    const chunkedUpload = await prisma.chunkedUpload.findUnique({
      where: { id: uploadId },
      include: { portal: { include: { user: true } } },
    })

    if (!chunkedUpload) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 })
    }

    if (chunkedUpload.status !== "in_progress") {
      return NextResponse.json({ error: "Upload session is not active" }, { status: 400 })
    }

    // Verify password if required
    if (chunkedUpload.portal.passwordHash && token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        if (payload.portalId !== portalId) {
          return NextResponse.json({ error: "Invalid token for this portal" }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
      }
    }

    // Reconstruct file from chunks
    const tempDir = path.join(os.tmpdir(), "uploads", uploadId)
    const chunks: Buffer[] = []

    for (let i = 0; i < chunkedUpload.totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk-${i}`)
      try {
        const chunkData = await fs.readFile(chunkPath)
        chunks.push(chunkData)
      } catch {
        return NextResponse.json(
          { error: `Missing chunk ${i}. Upload may be incomplete.` },
          { status: 400 }
        )
      }
    }

    const fileBuffer = Buffer.concat(chunks)

    // Security Scan - Skip for safe file types, async scan for others
    const { scanFile } = await import("@/lib/scanner")
    
    // Safe file types that don't need scanning (reduces latency)
    const SAFE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'application/pdf']
    const isSafeType = SAFE_TYPES.includes(mimeType)
    
    let scanResult: ScanResult = { status: "clean" }
    
    if (!isSafeType) {
      // Scan potentially dangerous files before returning
      scanResult = await scanFile(fileBuffer, fileName, mimeType)

      if (scanResult.status === "infected") {
        console.warn(`Blocked upload of infected file: ${fileName} (${scanResult.threat})`)
        await fs.rm(tempDir, { recursive: true, force: true })
        await prisma.chunkedUpload.update({
          where: { id: uploadId },
          data: { status: "failed" },
        })
        return NextResponse.json(
          { error: "Security Alert: File rejected due to detected malware signature." },
          { status: 400 }
        )
      }

      if (scanResult.status === "error") {
        console.error("File scan failed, rejecting upload")
        await fs.rm(tempDir, { recursive: true, force: true })
        await prisma.chunkedUpload.update({
          where: { id: uploadId },
          data: { status: "failed" },
        })
        return NextResponse.json(
          { error: "Security Check Failed: Unable to scan file. Please try again." },
          { status: 500 }
        )
      }
    } else {
      // For safe types, scan asynchronously in the background after upload completes
      console.log(`Skipping scan for safe file type: ${mimeType}`)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const uniqueFileName = `${timestamp}-${safeFileName}`

    // Upload to cloud storage
    const storageProvider = chunkedUpload.portal.storageProvider as StorageProvider
    const result = await uploadToCloudStorage(
      chunkedUpload.portal.userId,
      storageProvider,
      fileBuffer,
      uniqueFileName,
      mimeType,
      chunkedUpload.portal.storageFolderId || undefined,
      chunkedUpload.portal.storageFolderPath || undefined
    )

    if (!result.success) {
      await fs.rm(tempDir, { recursive: true, force: true })
      await prisma.chunkedUpload.update({
        where: { id: uploadId },
        data: { status: "failed" },
      })
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Create file upload record
    const uploadedAt = new Date()
    const ipAddress = request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const fileUpload = await prisma.fileUpload.create({
      data: {
        portalId: chunkedUpload.portalId,
        fileName: chunkedUpload.fileName,
        fileSize: chunkedUpload.fileSize,
        mimeType: chunkedUpload.mimeType,
        clientName: chunkedUpload.clientName || null,
        clientEmail: chunkedUpload.clientEmail || null,
        clientMessage: chunkedUpload.clientMessage || null,
        storageProvider,
        storageFileId: result.fileId || null,
        storagePath: result.webViewLink || null,
        status: "uploaded",
        ipAddress: ipAddress.split(",")[0].trim(),
        userAgent: userAgent.substring(0, 500),
        uploadedAt,
      },
    })

    // Update chunked upload status
    await prisma.chunkedUpload.update({
      where: { id: uploadId },
      data: { status: "completed" },
    })

    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true })

    // Invalidate caches
    await Promise.all([
      invalidateCache(getUserDashboardKey(chunkedUpload.portal.userId)),
      invalidateCache(getUserUploadsKey(chunkedUpload.portal.userId)),
      invalidateCache(getUserStatsKey(chunkedUpload.portal.userId)),
      invalidateCache(getUserPortalsKey(chunkedUpload.portal.userId)),
    ])

    // Send email notification (async)
    if (chunkedUpload.portal.user.email) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      sendUploadNotification({
        to: chunkedUpload.portal.user.email,
        portalName: chunkedUpload.portal.name,
        fileName: chunkedUpload.fileName,
        fileSize: chunkedUpload.fileSize,
        clientName: chunkedUpload.clientName || undefined,
        clientEmail: chunkedUpload.clientEmail || undefined,
        clientMessage: chunkedUpload.clientMessage || undefined,
        uploadedAt,
        portalUrl: `${baseUrl}/p/${chunkedUpload.portal.slug}`,
        dashboardUrl: `${baseUrl}/dashboard`,
      }).catch((err) => {
        console.error("Failed to send upload notification:", err)
      })
    }

    // Record upload metrics
    const uploadDuration = Date.now() - uploadStartTime
    const metrics = calculateMetrics(
      portalId,
      fileName,
      fileSize,
      uploadDuration,
      chunkedUpload.totalChunks
    )
    recordUploadMetrics(metrics)

    return NextResponse.json({
      success: true,
      uploadId: fileUpload.id,
      fileName: fileUpload.fileName,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
      storageProvider,
      uploadMetrics: {
        duration: uploadDuration,
        uploadSpeed: metrics.uploadSpeed,
      },
    })
  } catch (error) {
    console.error("Error completing chunked upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
