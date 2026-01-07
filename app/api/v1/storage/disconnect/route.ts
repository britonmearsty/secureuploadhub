/**
 * Storage Disconnect API
 * Consolidated endpoint for disconnecting storage providers
 */

import { NextRequest } from "next/server"
import { withAuthValidationAndLogging, ApiResponse } from "@/lib/api/middleware"
import { schemas } from "@/lib/api/schemas"
import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@prisma/client"

/**
 * POST /api/v1/storage/disconnect - Disconnect a storage provider
 */
export const POST = withAuthValidationAndLogging('STORAGE_DISCONNECT', schemas.storage.disconnect)(
  async (request: NextRequest, session: any, data: any) => {
    const { provider } = data

    // Check if this is the user's only login method
    const hasOtherLoginMethods = await prisma.account.count({
      where: {
        userId: session.user.id,
        provider: { not: provider }
      }
    })

    // Prevent disconnecting if it's the only login method
    if (hasOtherLoginMethods === 0) {
      return ApiResponse.error('BAD_REQUEST', {
        message: "Cannot disconnect your only login method. Please add another login method first.",
        cannotDisconnect: true
      })
    }

    // Use a transaction to update storage accounts only (keep OAuth for login)
    const result = await prisma.$transaction(async (tx) => {
      // Update storage accounts to DISCONNECTED (but keep OAuth account for login)
      const storageProvider = provider === "google" ? "google_drive" : "dropbox"
      
      const storageUpdateResult = await tx.storageAccount.updateMany({
        where: {
          userId: session.user.id,
          provider: storageProvider
        },
        data: {
          status: StorageAccountStatus.DISCONNECTED,
          isActive: false, // Keep deprecated field in sync
          lastError: "Storage access disabled by user",
          updatedAt: new Date()
        }
      })

      // Check for affected portals that might become non-functional
      const affectedPortals = await tx.uploadPortal.findMany({
        where: {
          userId: session.user.id,
          storageProvider: storageProvider
        },
        select: {
          id: true,
          name: true,
          storageProvider: true,
          isActive: true
        }
      })

      // AUTOMATIC PORTAL DEACTIVATION: Deactivate portals that use the disconnected storage
      let deactivatedPortals = 0
      if (affectedPortals.length > 0) {
        const activePortalIds = affectedPortals.filter(p => p.isActive).map(p => p.id)
        
        if (activePortalIds.length > 0) {
          const portalUpdateResult = await tx.uploadPortal.updateMany({
            where: {
              id: { in: activePortalIds }
            },
            data: {
              isActive: false
            }
          })
          
          deactivatedPortals = portalUpdateResult.count
        }
      }

      return {
        updatedStorageAccounts: storageUpdateResult.count,
        affectedPortals,
        deactivatedPortals
      }
    })

    let message = `Disconnected ${provider} storage access. You can still log in with ${provider}, but files won't be stored there.`
    
    if (result.affectedPortals.length > 0) {
      const portalNames = result.affectedPortals.map(p => p.name).join(", ")
      message += ` Note: ${result.affectedPortals.length} portal(s) (${portalNames}) may be affected and might need reconfiguration.`
      
      if (result.deactivatedPortals > 0) {
        message += ` ${result.deactivatedPortals} active portal(s) have been automatically deactivated.`
      }
    }

    return ApiResponse.success({
      success: true, 
      message,
      affectedPortals: result.affectedPortals.length,
      deactivatedPortals: result.deactivatedPortals,
      storageDisconnected: true,
      authPreserved: true
    })
  }
)