/**
 * Portal Management for Storage Account Changes
 * Handles automatic portal deactivation/reactivation when storage accounts change status
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "./account-states"

export interface PortalManagementResult {
  success: boolean
  deactivatedPortals: number
  reactivatedPortals: number
  affectedPortals: Array<{
    id: string
    name: string
    action: 'deactivated' | 'reactivated' | 'no_change'
    reason: string
  }>
  error?: string
}

/**
 * Deactivate portals when their storage account becomes inactive/disconnected
 */
export async function deactivatePortalsForStorageAccount(
  storageAccountId: string,
  reason: string = "Storage account is no longer active"
): Promise<PortalManagementResult> {
  try {
    console.log(`🔄 PORTAL_MGMT: Deactivating portals for storage account ${storageAccountId}`)

    // Find all active portals using this storage account
    const affectedPortals = await prisma.uploadPortal.findMany({
      where: {
        storageAccountId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        userId: true
      }
    })

    console.log(`🔍 PORTAL_MGMT: Found ${affectedPortals.length} active portals to deactivate`)

    if (affectedPortals.length === 0) {
      return {
        success: true,
        deactivatedPortals: 0,
        reactivatedPortals: 0,
        affectedPortals: []
      }
    }

    // Deactivate all affected portals
    const portalIds = affectedPortals.map(p => p.id)
    const updateResult = await prisma.uploadPortal.updateMany({
      where: {
        id: { in: portalIds }
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    console.log(`✅ PORTAL_MGMT: Deactivated ${updateResult.count} portals`)

    // Create audit logs for each deactivated portal
    const auditLogs = affectedPortals.map(portal => ({
      userId: portal.userId,
      action: 'PORTAL_AUTO_DEACTIVATED' as const,
      resource: 'UploadPortal' as const,
      resourceId: portal.id,
      details: {
        portalName: portal.name,
        storageAccountId,
        reason,
        timestamp: new Date().toISOString(),
        automatic: true
      }
    }))

    await prisma.auditLog.createMany({
      data: auditLogs
    })

    return {
      success: true,
      deactivatedPortals: updateResult.count,
      reactivatedPortals: 0,
      affectedPortals: affectedPortals.map(p => ({
        id: p.id,
        name: p.name,
        action: 'deactivated' as const,
        reason
      }))
    }

  } catch (error) {
    console.error(`❌ PORTAL_MGMT: Error deactivating portals for storage account ${storageAccountId}:`, error)
    return {
      success: false,
      deactivatedPortals: 0,
      reactivatedPortals: 0,
      affectedPortals: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Reactivate portals when their storage account becomes active again
 */
export async function reactivatePortalsForStorageAccount(
  storageAccountId: string,
  reason: string = "Storage account is now active"
): Promise<PortalManagementResult> {
  try {
    console.log(`🔄 PORTAL_MGMT: Checking portals for reactivation for storage account ${storageAccountId}`)

    // Find all inactive portals using this storage account that were auto-deactivated
    // We only reactivate portals that were automatically deactivated, not manually deactivated ones
    const potentialPortals = await prisma.uploadPortal.findMany({
      where: {
        storageAccountId,
        isActive: false
      },
      select: {
        id: true,
        name: true,
        userId: true
      }
    })

    console.log(`🔍 PORTAL_MGMT: Found ${potentialPortals.length} inactive portals to check for reactivation`)

    if (potentialPortals.length === 0) {
      return {
        success: true,
        deactivatedPortals: 0,
        reactivatedPortals: 0,
        affectedPortals: []
      }
    }

    // Check audit logs to see which portals were auto-deactivated (and thus can be auto-reactivated)
    const autoDeactivatedPortals = await prisma.auditLog.findMany({
      where: {
        action: 'PORTAL_AUTO_DEACTIVATED',
        resource: 'UploadPortal',
        resourceId: { in: potentialPortals.map(p => p.id) }
      },
      select: {
        resourceId: true
      }
    })

    const autoDeactivatedPortalIds = autoDeactivatedPortals.map(log => log.resourceId)
    const portalsToReactivate = potentialPortals.filter(p => autoDeactivatedPortalIds.includes(p.id))

    console.log(`🔍 PORTAL_MGMT: ${portalsToReactivate.length} portals were auto-deactivated and can be reactivated`)

    if (portalsToReactivate.length === 0) {
      return {
        success: true,
        deactivatedPortals: 0,
        reactivatedPortals: 0,
        affectedPortals: []
      }
    }

    // Reactivate the portals
    const portalIds = portalsToReactivate.map(p => p.id)
    const updateResult = await prisma.uploadPortal.updateMany({
      where: {
        id: { in: portalIds }
      },
      data: {
        isActive: true,
        updatedAt: new Date()
      }
    })

    console.log(`✅ PORTAL_MGMT: Reactivated ${updateResult.count} portals`)

    // Create audit logs for each reactivated portal
    const auditLogs = portalsToReactivate.map(portal => ({
      userId: portal.userId,
      action: 'PORTAL_AUTO_REACTIVATED' as const,
      resource: 'UploadPortal' as const,
      resourceId: portal.id,
      details: {
        portalName: portal.name,
        storageAccountId,
        reason,
        timestamp: new Date().toISOString(),
        automatic: true
      }
    }))

    await prisma.auditLog.createMany({
      data: auditLogs
    })

    return {
      success: true,
      deactivatedPortals: 0,
      reactivatedPortals: updateResult.count,
      affectedPortals: portalsToReactivate.map(p => ({
        id: p.id,
        name: p.name,
        action: 'reactivated' as const,
        reason
      }))
    }

  } catch (error) {
    console.error(`❌ PORTAL_MGMT: Error reactivating portals for storage account ${storageAccountId}:`, error)
    return {
      success: false,
      deactivatedPortals: 0,
      reactivatedPortals: 0,
      affectedPortals: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Handle portal management when storage account status changes
 */
export async function handleStorageAccountStatusChange(
  storageAccountId: string,
  oldStatus: StorageAccountStatus,
  newStatus: StorageAccountStatus,
  reason?: string
): Promise<PortalManagementResult> {
  console.log(`🔄 PORTAL_MGMT: Storage account ${storageAccountId} status changed: ${oldStatus} → ${newStatus}`)

  const wasActive = oldStatus === StorageAccountStatus.ACTIVE
  const isNowActive = newStatus === StorageAccountStatus.ACTIVE

  // If status didn't change in terms of portal functionality, do nothing
  if (wasActive === isNowActive) {
    console.log(`ℹ️ PORTAL_MGMT: No portal action needed - functional status unchanged`)
    return {
      success: true,
      deactivatedPortals: 0,
      reactivatedPortals: 0,
      affectedPortals: []
    }
  }

  if (wasActive && !isNowActive) {
    // Storage became inactive - deactivate portals
    return await deactivatePortalsForStorageAccount(
      storageAccountId,
      reason || `Storage account status changed to ${newStatus}`
    )
  } else if (!wasActive && isNowActive) {
    // Storage became active - reactivate portals that were auto-deactivated
    return await reactivatePortalsForStorageAccount(
      storageAccountId,
      reason || `Storage account status changed to ${newStatus}`
    )
  }

  return {
    success: true,
    deactivatedPortals: 0,
    reactivatedPortals: 0,
    affectedPortals: []
  }
}

/**
 * Bulk handle portal management for multiple storage accounts
 */
export async function handleMultipleStorageAccountChanges(
  changes: Array<{
    storageAccountId: string
    oldStatus: StorageAccountStatus
    newStatus: StorageAccountStatus
    reason?: string
  }>
): Promise<PortalManagementResult> {
  console.log(`🔄 PORTAL_MGMT: Handling ${changes.length} storage account status changes`)

  let totalDeactivated = 0
  let totalReactivated = 0
  const allAffectedPortals: PortalManagementResult['affectedPortals'] = []

  for (const change of changes) {
    const result = await handleStorageAccountStatusChange(
      change.storageAccountId,
      change.oldStatus,
      change.newStatus,
      change.reason
    )

    if (result.success) {
      totalDeactivated += result.deactivatedPortals
      totalReactivated += result.reactivatedPortals
      allAffectedPortals.push(...result.affectedPortals)
    } else {
      console.error(`❌ PORTAL_MGMT: Failed to handle change for ${change.storageAccountId}:`, result.error)
    }
  }

  return {
    success: true,
    deactivatedPortals: totalDeactivated,
    reactivatedPortals: totalReactivated,
    affectedPortals: allAffectedPortals
  }
}