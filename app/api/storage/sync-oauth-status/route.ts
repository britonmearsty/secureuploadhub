import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@/lib/storage/account-states"
import { handleMultipleStorageAccountChanges } from "@/lib/storage/portal-management"

// POST /api/storage/sync-oauth-status - Sync storage account status with OAuth status
export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user with OAuth accounts and storage accounts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          where: {
            provider: { in: ['google', 'dropbox'] }
          }
        },
        storageAccounts: {
          where: {
            provider: { in: ['google_drive', 'dropbox'] }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let syncedCount = 0
    const actions: string[] = []
    const statusChanges: Array<{
      storageAccountId: string
      oldStatus: StorageAccountStatus
      newStatus: StorageAccountStatus
      reason: string
    }> = []

    // Check each storage account against its OAuth status
    for (const storageAccount of user.storageAccounts) {
      const oauthProvider = storageAccount.provider === 'google_drive' ? 'google' : 'dropbox'
      
      // Find corresponding OAuth account
      const oauthAccount = user.accounts.find((acc: any) => 
        acc.provider === oauthProvider && 
        acc.providerAccountId === storageAccount.providerAccountId
      )

      let shouldBeStatus: StorageAccountStatus
      let reason: string

      if (!oauthAccount) {
        // No OAuth account exists
        shouldBeStatus = StorageAccountStatus.DISCONNECTED
        reason = "No OAuth account found"
      } else if (!oauthAccount.access_token) {
        // OAuth account exists but no access token
        shouldBeStatus = StorageAccountStatus.DISCONNECTED
        reason = "No access token"
      } else {
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000)
        const isExpired = oauthAccount.expires_at && oauthAccount.expires_at < now - 60

        if (isExpired && !oauthAccount.refresh_token) {
          shouldBeStatus = StorageAccountStatus.DISCONNECTED
          reason = "Token expired, no refresh token"
        } else if (isExpired) {
          shouldBeStatus = StorageAccountStatus.ERROR
          reason = "Token expired, needs refresh"
        } else {
          shouldBeStatus = StorageAccountStatus.ACTIVE
          reason = "OAuth is valid"
        }
      }

      // Update storage account if status doesn't match
      if (storageAccount.status !== shouldBeStatus) {
        try {
          await prisma.storageAccount.update({
            where: { id: storageAccount.id },
            data: {
              status: shouldBeStatus,
              isActive: shouldBeStatus === StorageAccountStatus.ACTIVE,
              lastError: shouldBeStatus === StorageAccountStatus.ACTIVE ? null : reason,
              updatedAt: new Date()
            }
          })

          actions.push(`🔄 Updated ${oauthProvider} storage: ${storageAccount.status} → ${shouldBeStatus} (${reason})`)
          
          // Track status change for portal management
          statusChanges.push({
            storageAccountId: storageAccount.id,
            oldStatus: storageAccount.status,
            newStatus: shouldBeStatus,
            reason
          })
          
          syncedCount++
        } catch (error) {
          actions.push(`❌ Failed to update ${oauthProvider} storage: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        actions.push(`✓ ${oauthProvider} storage status is already correct: ${storageAccount.status}`)
      }
    }

    // Handle portal deactivation/reactivation based on storage account changes
    let portalManagementResult = {
      deactivatedPortals: 0,
      reactivatedPortals: 0,
      affectedPortals: [] as any[]
    }

    if (statusChanges.length > 0) {
      console.log(`🔄 OAUTH_SYNC: Handling portal management for ${statusChanges.length} storage account changes`)
      portalManagementResult = await handleMultipleStorageAccountChanges(statusChanges)
      
      if (portalManagementResult.deactivatedPortals > 0) {
        actions.push(`🔒 Auto-deactivated ${portalManagementResult.deactivatedPortals} portal(s) due to storage account changes`)
      }
      if (portalManagementResult.reactivatedPortals > 0) {
        actions.push(`🔓 Auto-reactivated ${portalManagementResult.reactivatedPortals} portal(s) due to storage account changes`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} storage account(s) with OAuth status`,
      summary: {
        totalSynced: syncedCount,
        totalChecked: user.storageAccounts.length,
        oauthAccounts: user.accounts.length,
        deactivatedPortals: portalManagementResult.deactivatedPortals,
        reactivatedPortals: portalManagementResult.reactivatedPortals,
        affectedPortals: portalManagementResult.affectedPortals.length
      },
      actions,
      portalChanges: portalManagementResult.affectedPortals
    })

  } catch (error) {
    console.error("OAuth status sync failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}