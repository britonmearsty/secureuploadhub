import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { validateStorageConnection, getStorageService } from "@/lib/storage"
import { StorageAccountStatus } from "@/lib/storage/account-states"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`Running storage health check for user ${session.user.id}`)

    // Get all OAuth accounts for the user
    const oauthAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        provider: { in: ["google", "dropbox"] }
      }
    })

    // Get all storage accounts for the user
    const storageAccounts = await prisma.storageAccount.findMany({
      where: {
        userId: session.user.id
      }
    })

    const results = []

    // Check each OAuth account and ensure there's a corresponding storage account
    for (const oauthAccount of oauthAccounts) {
      const storageProvider = oauthAccount.provider === "google" ? "GOOGLE_DRIVE" : "DROPBOX"
      
      // Get account info to find email
      let accountEmail = null
      try {
        const provider = oauthAccount.provider === "google" ? "google_drive" : "dropbox"
        const tokenResult = await validateStorageConnection(session.user.id, provider)
        
        if (tokenResult.isValid) {
          const service = getStorageService(provider)
          if (service && service.getAccountInfo && oauthAccount.access_token) {
            const accountInfo = await service.getAccountInfo(oauthAccount.access_token)
            accountEmail = accountInfo.email
          }
        }
      } catch (error) {
        console.log(`Could not get account info for ${oauthAccount.provider}:`, error)
      }
      
      // Find corresponding storage account by provider and providerAccountId
      let storageAccount = storageAccounts.find(sa => 
        sa.provider === storageProvider && sa.providerAccountId === oauthAccount.providerAccountId
      )

      // If no storage account exists, create one
      if (!storageAccount) {
        console.log(`Creating missing storage account for ${oauthAccount.provider} (${oauthAccount.providerAccountId})`)
        
        storageAccount = await prisma.storageAccount.create({
          data: {
            userId: session.user.id,
            provider: storageProvider,
            providerAccountId: oauthAccount.providerAccountId,
            status: StorageAccountStatus.ACTIVE,
            displayName: accountEmail || `${oauthAccount.provider} Account`,
            email: accountEmail,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        results.push({
          accountId: storageAccount.id,
          provider: storageAccount.provider,
          action: 'created',
          previousStatus: null,
          newStatus: StorageAccountStatus.ACTIVE,
          error: null
        })
      } else {
        // Storage account exists, validate the connection
        const provider = storageAccount.provider === "GOOGLE_DRIVE" ? "google_drive" : "dropbox"
        
        console.log(`Testing connection for existing account ${storageAccount.id} (${storageAccount.provider})...`)
        
        const validation = await validateStorageConnection(session.user.id, provider)
        
        console.log(`Validation result for ${storageAccount.id}:`, validation)
        
        if (!validation.isValid) {
          // Only update to DISCONNECTED if currently not DISCONNECTED
          if (storageAccount.status !== StorageAccountStatus.DISCONNECTED) {
            await prisma.storageAccount.update({
              where: { id: storageAccount.id },
              data: {
                status: StorageAccountStatus.DISCONNECTED,
                lastError: validation.error || "Connection validation failed",
                updatedAt: new Date()
              }
            })

            results.push({
              accountId: storageAccount.id,
              provider: storageAccount.provider,
              action: 'disconnected',
              previousStatus: storageAccount.status,
              newStatus: StorageAccountStatus.DISCONNECTED,
              error: validation.error
            })
          }
        } else {
          // Connection is valid, ensure status is ACTIVE
          if (storageAccount.status !== StorageAccountStatus.ACTIVE) {
            await prisma.storageAccount.update({
              where: { id: storageAccount.id },
              data: {
                status: StorageAccountStatus.ACTIVE,
                lastError: null,
                updatedAt: new Date()
              }
            })

            results.push({
              accountId: storageAccount.id,
              provider: storageAccount.provider,
              action: 'reconnected',
              previousStatus: storageAccount.status,
              newStatus: StorageAccountStatus.ACTIVE,
              error: null
            })
          } else {
            results.push({
              accountId: storageAccount.id,
              provider: storageAccount.provider,
              action: 'verified',
              previousStatus: storageAccount.status,
              newStatus: storageAccount.status,
              error: null
            })
          }
        }
      }
    }

    // Check for orphaned storage accounts (storage accounts without OAuth)
    for (const storageAccount of storageAccounts) {
      const oauthProvider = storageAccount.provider === "GOOGLE_DRIVE" ? "google" : "dropbox"
      const hasOAuth = oauthAccounts.some(oa => oa.provider === oauthProvider)
      
      if (!hasOAuth && storageAccount.status !== StorageAccountStatus.DISCONNECTED) {
        console.log(`Marking orphaned storage account ${storageAccount.id} as DISCONNECTED`)
        
        await prisma.storageAccount.update({
          where: { id: storageAccount.id },
          data: {
            status: StorageAccountStatus.DISCONNECTED,
            lastError: "No corresponding OAuth account found",
            updatedAt: new Date()
          }
        })

        results.push({
          accountId: storageAccount.id,
          provider: storageAccount.provider,
          action: 'orphaned',
          previousStatus: storageAccount.status,
          newStatus: StorageAccountStatus.DISCONNECTED,
          error: "No corresponding OAuth account found"
        })
      }
    }

    return NextResponse.json({
      success: true,
      checkedAccounts: results.length,
      results
    })

  } catch (error) {
    console.error("Storage health check failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}