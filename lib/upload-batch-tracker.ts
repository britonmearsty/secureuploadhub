/**
 * Upload Batch Tracker
 * Manages batch upload sessions and sends notifications after all files are uploaded
 */

import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email-service"
import { BatchUploadNotificationEmail } from "@/emails/BatchUploadNotificationEmail"
import redis from "@/lib/redis"
import React from "react"

export interface BatchUploadSession {
  batchId: string
  portalId: string
  clientName?: string
  clientEmail?: string
  clientMessage?: string
  expectedFileCount: number
  uploadedFiles: string[] // Array of file upload IDs
  createdAt: Date
  expiresAt: Date
}

export interface BatchUploadFile {
  fileName: string
  fileSize: number
  uploadId: string
}

/**
 * Create a new batch upload session
 */
export async function createBatchUploadSession(
  portalId: string,
  expectedFileCount: number,
  clientName?: string,
  clientEmail?: string,
  clientMessage?: string
): Promise<string> {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes

  const session: BatchUploadSession = {
    batchId,
    portalId,
    clientName,
    clientEmail,
    clientMessage,
    expectedFileCount,
    uploadedFiles: [],
    createdAt: now,
    expiresAt
  }

  // Store in Redis with expiration
  await redis.setex(`batch:${batchId}`, 1800, JSON.stringify(session)) // 30 minutes

  console.log(`📦 BATCH_CREATED: ${batchId} - Expecting ${expectedFileCount} files for portal ${portalId}`)
  return batchId
}

/**
 * Add a file upload to a batch session
 */
export async function addFileToBatch(
  batchId: string,
  uploadId: string,
  fileName: string,
  fileSize: number
): Promise<{ isComplete: boolean; session?: BatchUploadSession }> {
  try {
    const sessionData = await redis.get(`batch:${batchId}`)
    if (!sessionData) {
      console.warn(`⚠️ BATCH_NOT_FOUND: ${batchId} - Session expired or doesn't exist`)
      return { isComplete: false }
    }

    const session: BatchUploadSession = JSON.parse(sessionData)
    
    // Add the file to the batch
    session.uploadedFiles.push(uploadId)
    
    console.log(`📁 BATCH_FILE_ADDED: ${batchId} - File ${fileName} added (${session.uploadedFiles.length}/${session.expectedFileCount})`)

    // Check if batch is complete
    const isComplete = session.uploadedFiles.length >= session.expectedFileCount

    if (isComplete) {
      console.log(`✅ BATCH_COMPLETE: ${batchId} - All ${session.expectedFileCount} files uploaded`)
      
      // Remove from Redis since we're done
      await redis.del(`batch:${batchId}`)
      
      return { isComplete: true, session }
    } else {
      // Update session in Redis
      await redis.setex(`batch:${batchId}`, 1800, JSON.stringify(session))
      return { isComplete: false, session }
    }
  } catch (error) {
    console.error(`❌ BATCH_ERROR: ${batchId} - Error adding file:`, error)
    return { isComplete: false }
  }
}

/**
 * Send batch upload notification email
 */
export async function sendBatchUploadNotification(
  session: BatchUploadSession
): Promise<void> {
  try {
    // Get portal and user information
    const portal = await prisma.uploadPortal.findUnique({
      where: { id: session.portalId },
      include: { user: true }
    })

    if (!portal || !portal.user.email) {
      console.warn(`⚠️ BATCH_EMAIL_SKIP: ${session.batchId} - Portal or user email not found`)
      return
    }

    // Get all uploaded files information
    const uploadedFiles = await prisma.fileUpload.findMany({
      where: {
        id: { in: session.uploadedFiles },
        portalId: session.portalId
      },
      select: {
        fileName: true,
        fileSize: true,
        uploadedAt: true
      },
      orderBy: { uploadedAt: 'asc' }
    })

    if (uploadedFiles.length === 0) {
      console.warn(`⚠️ BATCH_EMAIL_SKIP: ${session.batchId} - No uploaded files found`)
      return
    }

    // Calculate total file size and get file names
    const totalSize = uploadedFiles.reduce((sum, file) => sum + file.fileSize, 0)
    const fileNames = uploadedFiles.map(f => f.fileName)
    const fileCount = uploadedFiles.length
    
    // Use the first file's upload time as the batch upload time
    const uploadedAt = uploadedFiles[0].uploadedAt || new Date()

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

    // Send batch upload notification using the specialized template
    await sendEmail({
      to: portal.user.email,
      subject: fileCount === 1 
        ? `New file uploaded to ${portal.name}`
        : `${fileCount} files uploaded to ${portal.name}`,
      react: React.createElement(BatchUploadNotificationEmail, {
        portalName: portal.name,
        fileCount: fileCount,
        fileNames: fileNames,
        totalSize: totalSize,
        clientName: session.clientName,
        clientEmail: session.clientEmail,
        clientMessage: session.clientMessage,
        uploadedAt: uploadedAt,
        dashboardUrl: `${baseUrl}/dashboard`,
        portalUrl: `${baseUrl}/p/${portal.slug}`
      }),
    })

    console.log(`📧 BATCH_EMAIL_SENT: ${session.batchId} - Notification sent for ${fileCount} files to ${portal.user.email}`)

  } catch (error) {
    console.error(`❌ BATCH_EMAIL_ERROR: ${session.batchId} - Failed to send notification:`, error)
  }
}

/**
 * Check if a batch upload session exists
 */
export async function getBatchUploadSession(batchId: string): Promise<BatchUploadSession | null> {
  try {
    const sessionData = await redis.get(`batch:${batchId}`)
    if (!sessionData) {
      return null
    }
    return JSON.parse(sessionData)
  } catch (error) {
    console.error(`❌ BATCH_GET_ERROR: ${batchId} - Error getting session:`, error)
    return null
  }
}

/**
 * Clean up expired batch sessions (run periodically)
 */
export async function cleanupExpiredBatchSessions(): Promise<number> {
  try {
    // Note: This is a simplified implementation
    // In production, you might want to use Redis SCAN for better performance
    const pattern = 'batch:*'
    let cleanedCount = 0

    // For now, we'll implement a basic cleanup
    // In a real Redis implementation, you'd use SCAN to iterate through keys
    console.log('🧹 BATCH_CLEANUP: Starting cleanup of expired sessions')
    
    // Since we can't easily scan keys in the current Redis setup,
    // we rely on Redis TTL to automatically expire keys
    // This function serves as a placeholder for more advanced cleanup logic
    
    console.log(`🧹 BATCH_CLEANUP_COMPLETE: Redis TTL handles automatic cleanup`)
    return cleanedCount
  } catch (error) {
    console.error('❌ BATCH_CLEANUP_ERROR: Error cleaning up expired sessions:', error)
    return 0
  }
}

/**
 * Force complete a batch (useful for error recovery)
 */
export async function forceCompleteBatch(batchId: string): Promise<boolean> {
  try {
    const session = await getBatchUploadSession(batchId)
    if (!session) {
      return false
    }

    // Send notification with whatever files we have
    await sendBatchUploadNotification(session)
    
    // Remove from Redis
    await redis.del(`batch:${batchId}`)
    
    console.log(`🔧 BATCH_FORCE_COMPLETE: ${batchId} - Batch force completed with ${session.uploadedFiles.length} files`)
    return true
  } catch (error) {
    console.error(`❌ BATCH_FORCE_ERROR: ${batchId} - Error force completing batch:`, error)
    return false
  }
}