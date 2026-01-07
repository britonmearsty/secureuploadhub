/**
 * Individual Upload API
 * Consolidated endpoint for individual upload operations
 */

import { NextRequest } from "next/server"
import { withAuthAndLogging, withOwnership, ApiResponse } from "@/lib/api/middleware"
import prisma from "@/lib/prisma"
import { deleteFromCloudStorageWithCascade } from "@/lib/storage"
import { invalidateCache, getUserDashboardKey, getUserUploadsKey, getUserStatsKey } from "@/lib/cache"
import { StorageAccountStatus } from "@prisma/client"

/**
 * GET /api/v1/uploads/[id] - Get upload details
 */
export const GET = withAuthAndLogging('UPLOAD_DETAILS')(
  withOwnership('upload', (request, params) => params.id)(
    async (request: NextRequest, session: any, { params }: { params: Promise<{ id: string }> }) => {
      const { id } = await params

      const upload = await prisma.fileUpload.findUnique({
        where: { id },
        include: {
          portal: {
            select: {
              id: true,
              name: true,
              slug: true,
              primaryColor: true,
              userId: true
            }
          },
          storageAccount: {
            select: {
              id: true,
              provider: true,
              status: true,
              displayName: true,
              email: true
            }
          }
        }
      })

      if (!upload) {
        return ApiResponse.error('NOT_FOUND')
      }

      return ApiResponse.success(upload)
    }
  )
)

/**
 * DELETE /api/v1/uploads/[id] - Delete an upload
 */
export const DELETE = withAuthAndLogging('UPLOAD_DELETE')(
  withOwnership('upload', (request, params) => params.id)(
    async (request: NextRequest, session: any, { params }: { params: Promise<{ id: string }> }) => {
      const { id } = await params

      const upload = await prisma.fileUpload.findUnique({
        where: { id },
        include: {
          portal: {
            select: {
              userId: true,
            }
          },
          storageAccount: {
            select: {
              id: true,
              provider: true,
              status: true,
              email: true
            }
          }
        }
      })

      if (!upload) {
        return ApiResponse.error('NOT_FOUND')
      }

      // Check storage account status before allowing delete
      if (upload.storageAccount) {
        const status = upload.storageAccount.status
        if (status === StorageAccountStatus.DISCONNECTED) {
          return ApiResponse.error('FORBIDDEN', {
            message: "File unavailable",
            details: `Cannot delete file. Your ${upload.storageAccount.provider} storage account is disconnected.`,
            requiresReconnection: true
          })
        } else if (status === StorageAccountStatus.ERROR) {
          return ApiResponse.error('FORBIDDEN', {
            message: "File unavailable", 
            details: "Cannot delete file. There are connection issues with your storage account.",
            isTemporary: true
          })
        }
      }

      // Delete from cloud storage if applicable
      if (upload.storageProvider === "google_drive" || upload.storageProvider === "dropbox") {
        const storageId = upload.storageFileId || upload.storagePath
        if (storageId) {
          try {
            const deleteResult = await deleteFromCloudStorageWithCascade(
              session.user.id,
              upload.storageProvider,
              storageId,
              upload.id // Pass the database ID for direct deletion
            )
            
            console.log('Cloud storage deletion result:', deleteResult)
            
            // If database was already deleted by cascade function, we're done
            if (deleteResult.deletedFromDatabase) {
              // Invalidate caches
              await Promise.all([
                invalidateCache(getUserDashboardKey(session.user.id)),
                invalidateCache(getUserUploadsKey(session.user.id)),
                invalidateCache(getUserStatsKey(session.user.id))
              ])
              
              return ApiResponse.success({
                success: true,
                message: deleteResult.deletedFromCloud 
                  ? "File deleted from cloud storage and database"
                  : "File removed from database (was already deleted from cloud storage)"
              })
            }
            
            // If cloud deletion failed but it's not a critical error, continue with DB deletion
            if (!deleteResult.success && !deleteResult.error?.includes('not found')) {
              console.error("Cloud storage deletion failed:", deleteResult.error)
              // Continue with database deletion anyway - user initiated this action
            }
          } catch (error) {
            console.error("Error in cascade deletion:", error)
            // Continue with DB deletion even if cloud deletion fails
          }
        }
      }

      // Delete from database (fallback if cascade deletion didn't handle it)
      await prisma.fileUpload.delete({
        where: { id }
      })

      // Invalidate caches
      await Promise.all([
        invalidateCache(getUserDashboardKey(session.user.id)),
        invalidateCache(getUserUploadsKey(session.user.id)),
        invalidateCache(getUserStatsKey(session.user.id))
      ])

      return ApiResponse.success({ success: true })
    }
  )
)