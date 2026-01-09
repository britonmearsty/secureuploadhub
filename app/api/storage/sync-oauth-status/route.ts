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
        } else if (isExpired && oauthAccount.refresh_token) {
          // Attempt to refresh the token automatically
          console.log(`🔄 SYNC_OAUTH: Attempting to refresh expired ${oauthProvider} token`)
          const refreshResult = await attemptTokenRefresh(oauthProvider, oauthAccount.refresh_token)
          
          if (refreshResult.success) {
            // Update the OAuth account with new token
            await prisma.account.update({
              where: {
                provider_providerAccountId: {
                  provider: oauthAccount.provider,
                  providerAccountId: oauthAccount.providerAccountId
                }
              },
              data: {
                access_token: refreshResult.access_token,
                expires_at: refreshResult.expires_at,
                refresh_token: refreshResult.refresh_token || oauthAccount.refresh_token,
                updatedAt: new Date()
              }
            })
            
            shouldBeStatus = StorageAccountStatus.ACTIVE
            reason = "Token refreshed automatically"
            actions.push(`✅ Auto-refreshed ${oauthProvider} token`)
          } else {
            shouldBeStatus = StorageAccountStatus.ERROR
            reason = `Token refresh failed: ${refreshResult.error}`
          }
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

async function attemptTokenRefresh(provider: string, refreshToken: string) {
  try {
    if (provider === 'google') {
      return await refreshGoogleToken(refreshToken)
    } else if (provider === 'dropbox') {
      return await refreshDropboxToken(refreshToken)
    } else {
      return { success: false, error: 'Unsupported provider' }
    }
  } catch (error) {
    console.error(`Error refreshing ${provider} token:`, error)
    return { success: false, error: 'Token refresh failed' }
  }
}

async function refreshGoogleToken(refreshToken: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error_description || 'Failed to refresh Google token'
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      refresh_token: data.refresh_token
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error while refreshing token'
    }
  }
}

async function refreshDropboxToken(refreshToken: string) {
  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DROPBOX_CLIENT_ID!,
        client_secret: process.env.DROPBOX_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error_description || 'Failed to refresh Dropbox token'
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      refresh_token: data.refresh_token || refreshToken
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error while refreshing token'
    }
  }
}