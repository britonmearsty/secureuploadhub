import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// POST /api/upload - Handle file upload
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const file = formData.get("file") as File | null
    const portalId = formData.get("portalId") as string | null
    const clientName = formData.get("clientName") as string | null
    const clientEmail = formData.get("clientEmail") as string | null
    const clientMessage = formData.get("clientMessage") as string | null

    // Validate required fields
    if (!file || !portalId) {
      return NextResponse.json({ error: "File and portal ID are required" }, { status: 400 })
    }

    // Get portal and validate
    const portal = await prisma.uploadPortal.findUnique({
      where: { id: portalId }
    })

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    if (!portal.isActive) {
      return NextResponse.json({ error: "Portal is not active" }, { status: 400 })
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

    // Get client info from request
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Create upload directory structure
    const uploadsDir = path.join(process.cwd(), "uploads", portalId)
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}-${safeFileName}`
    const filePath = path.join(uploadsDir, fileName)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create file upload record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        portalId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        clientMessage: clientMessage || null,
        storageProvider: "local",
        storagePath: filePath,
        status: "uploaded",
        ipAddress: ipAddress.split(",")[0].trim(),
        userAgent: userAgent.substring(0, 500),
        uploadedAt: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      uploadId: fileUpload.id,
      fileName: file.name,
    })
  } catch (error) {
    console.error("Error handling upload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

