import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@/lib/storage/account-states"

// POST /api/storage/disconnect - Disconnect a storage account (NOT authentication)
export async function POST(request: Request) {
  console.log('🔍 STORAGE_DISCONNECT: Request received')
  
  try {
    const session = await auth()
    console.log('🔍 STORAGE_DISCONNECT: Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()
    console.log('🔍 STORAGE_DISCONNECT: Provider to disconnect:', provider)

    if (!provider || !["google", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    // Check if this is the user's login method
    const hasOtherLoginMethods = await prisma.account.count({
      where: {
        userId: session.user.id,
        provider: { not: provider }
      }
    })
    
    console.log('🔍 STORAGE_DISCONNECT: Other login methods count:', hasOtherLoginMethods)

    // Prevent disconnecting if it's the only login method
    if (hasOtherLoginMethods === 0) {
      console.log('❌ STORAGE_DISCONNECT: Cannot disconnect only login method')
      return NextResponse.json({ 
        error: "Cannot disconnect your only login method. Please add another login method first.",
        cannotDisconnect: true
      }, { status: 400 })
    }

    // Use a transaction to update storage accounts only (keep OAuth for login)
    const result = await prisma.$transaction(async (tx) => {
      // Update storage accounts to DISCONNECTED (but keep OAuth account for login)
      const storageProvider = provider === "google" ? "google_drive" : "dropbox"
      console.log('🔍 STORAGE_DISCONNECT: Updating storage provider:', storageProvider)
      console.log('🔍 STORAGE_DISCONNECT: User ID:', session.user.id)
      
      // First, let's see what storage accounts exist for this user
      const existingAccounts = await tx.storageAccount.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          id: true,
          provider: true,
          status: true,
          providerAccountId: true
        }
      })
      
      console.log('🔍 STORAGE_DISCONNECT: Existing storage accounts:', existingAccounts)
      
      const storageUpdateResult = await tx.storageAccount.updateMany({
        where: {
          userId: session.user.id,
          provider: storageProvider
        },
        data: {
          status: StorageAccountStatus.DISCONNECTED,
          lastError: "Storage access disabled by user",
          updatedAt: new Date()
        }
      })
      
      console.log('🔍 STORAGE_DISCONNECT: Storage accounts updated:', storageUpdateResult.count)
      
      // Let's also check what the accounts look like after update
      const updatedAccounts = await tx.storageAccount.findMany({
        where: {
          userId: session.user.id,
          provider: storageProvider
        },
        select: {
          id: true,
          provider: true,
          status: true,
          lastError: true
        }
      })
      
      console.log('🔍 STORAGE_DISCONNECT: Accounts after update:', updatedAccounts)

      // Check for affected portals that might become non-functional
      const affectedPortals = await tx.uploadPortal.findMany({
        where: {
          userId: session.user.id,
          storageProvider: provider === "google" ? "google_drive" : "dropbox"
        },
        select: {
          id: true,
          name: true,
          storageProvider: true,
          isActive: true
        }
      })
      
      console.log('🔍 STORAGE_DISCONNECT: Affected portals:', affectedPortals.length)

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
          console.log('🔍 STORAGE_DISCONNECT: Deactivated portals:', deactivatedPortals)
        }
      }

      return {
        updatedStorageAccounts: storageUpdateResult.count,
        affectedPortals,
        deactivatedPortals,
        updatedAccounts
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

    console.log('✅ STORAGE_DISCONNECT: Success:', {
      updatedAccounts: result.updatedStorageAccounts,
      affectedPortals: result.affectedPortals.length,
      updatedAccountsDetails: result.updatedAccounts
    })

    // CRITICAL: Let's verify the update actually happened
    const verificationAccounts = await prisma.storageAccount.findMany({
      where: {
        userId: session.user.id,
        provider: provider === "google" ? "google_drive" : "dropbox"
      },
      select: {
        id: true,
        provider: true,
        status: true,
        lastError: true,
        updatedAt: true
      }
    })
    
    console.log('🔍 STORAGE_DISCONNECT: Verification check after transaction:', verificationAccounts)

    return NextResponse.json({ 
      success: true, 
      message,
      affectedPortals: result.affectedPortals.length,
      deactivatedPortals: result.deactivatedPortals,
      storageDisconnected: true,
      authPreserved: true
    })
  } catch (error) {
    console.error("❌ STORAGE_DISCONNECT: Error disconnecting storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
