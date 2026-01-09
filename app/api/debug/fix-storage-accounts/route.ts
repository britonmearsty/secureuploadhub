import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@prisma/client"

// POST /api/debug/fix-storage-accounts - Fix storage accounts for current user
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

    for (const oauthAccount of user.accounts) {
      const storageProvider = oauthAccount.provider === 'google' ? 'google_drive' : 'dropbox'
      
      // Find corresponding storage account
      const existingStorage = user.storageAccounts.find(s => 
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
            
            actions.push(`📧 Updated email for ${oauthAccount.provider} storage: ${existingStorage.id}`)
            fixedCount++
          } catch (error) {
            actions.push(`❌ Failed to update email for ${oauthAccount.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        } else {
          actions.push(`✅ ${oauthAccount.provider} storage account is already active and correct: ${existingStorage.id}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalFixes: fixedCount,
        accountsCreated: createdCount,
        accountsReactivated: reactivatedCount
      },
      actions
    })

  } catch (error) {
    console.error('Fix storage accounts error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}