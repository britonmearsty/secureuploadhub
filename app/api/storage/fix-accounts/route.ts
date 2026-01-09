import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@/lib/storage/account-states"
import { handleMultipleStorageAccountChanges } from "@/lib/storage/portal-management"

// POST /api/storage/fix-accounts - Fix storage accounts for current user
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

    let fixedCount = 0
    let createdCount = 0
    let reactivatedCount = 0
    const actions: string[] = []
    const statusChanges: Array<{
      storageAccountId: string
      oldStatus: StorageAccountStatus
      newStatus: StorageAccountStatus
      reason: string
    }> = []

    for (const oauthAccount of user.accounts) {
      const storageProvider = oauthAccount.provider === 'google' ? 'google_drive' : 'dropbox'
      
      // Find corresponding storage account
      const existingStorage = user.storageAccounts.find((s: any) => 
        s.provider === storageProvider && 
        s.providerAccountId === oauthAccount.providerAccountId
      )

      if (!existingStorage) {
        // Create missing storage account
        try {
          const newStorage = await prisma.storageAccount.create({
            data: {
              userId: user.id,
              provider: storageProvider,
              providerAccountId: oauthAccount.providerAccountId,
              displayName: user.name || `${oauthAccount.provider} Account`,
              email: user.email,
              status: StorageAccountStatus.ACTIVE,
              isActive: true,
              createdAt: oauthAccount.createdAt || new Date(),
              updatedAt: new Date(),
              lastAccessedAt: new Date()
            }
          })
          
          actions.push(`✅ Created storage account for ${oauthAccount.provider}: ${newStorage.id}`)
          createdCount++
          fixedCount++
        } catch (error) {
          actions.push(`❌ Failed to create storage account for ${oauthAccount.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else if (existingStorage.status !== StorageAccountStatus.ACTIVE) {
        // Reactivate inactive storage account
        try {
          await prisma.storageAccount.update({
            where: { id: existingStorage.id },
            data: {
              status: StorageAccountStatus.ACTIVE,
              isActive: true,
              lastError: null,
              lastAccessedAt: new Date(),
              updatedAt: new Date(),
              email: user.email // Ensure email matches login email
            }
          })
          
          actions.push(`🔄 Reactivated ${oauthAccount.provider} storage (was ${existingStorage.status}): ${existingStorage.id}`)
          
          // Track status change for portal management
          statusChanges.push({
            storageAccountId: existingStorage.id,
            oldStatus: existingStorage.status,
            newStatus: StorageAccountStatus.ACTIVE,
            reason: `Reactivated via fix-accounts API`
          })
          
          reactivatedCount++
          fixedCount++
        } catch (error) {
          actions.push(`❌ Failed to reactivate storage account for ${oauthAccount.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        // Update email to ensure it matches login email
        if (existingStorage.email !== user.email) {
          try {
            await prisma.storageAccount.update({
              where: { id: existingStorage.id },
              data: {
                email: user.email,
                updatedAt: new Date()
              }
            })
            
            actions.push(`📧 Updated email for ${oauthAccount.provider} storage: ${existingStorage.email} → ${user.email}`)
            fixedCount++
          } catch (error) {
            actions.push(`❌ Failed to update email for ${oauthAccount.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        } else {
          actions.push(`✓ ${oauthAccount.provider} storage account is already active and up-to-date`)
        }
      }
    }

    // Handle portal reactivation based on storage account changes
    let portalManagementResult = {
      deactivatedPortals: 0,
      reactivatedPortals: 0,
      affectedPortals: [] as any[]
    }

    if (statusChanges.length > 0) {
      console.log(`🔄 FIX_ACCOUNTS: Handling portal management for ${statusChanges.length} storage account changes`)
      portalManagementResult = await handleMultipleStorageAccountChanges(statusChanges)
      
      if (portalManagementResult.reactivatedPortals > 0) {
        actions.push(`🔓 Auto-reactivated ${portalManagementResult.reactivatedPortals} portal(s) due to storage account reactivation`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} storage account(s)`,
      summary: {
        totalFixed: fixedCount,
        created: createdCount,
        reactivated: reactivatedCount,
        oauthAccounts: user.accounts.length,
        storageAccounts: user.storageAccounts.length,
        reactivatedPortals: portalManagementResult.reactivatedPortals,
        affectedPortals: portalManagementResult.affectedPortals.length
      },
      actions,
      portalChanges: portalManagementResult.affectedPortals
    })

  } catch (error) {
    console.error("Storage account fix failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}