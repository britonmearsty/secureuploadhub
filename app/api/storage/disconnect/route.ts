import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@/lib/storage/account-states"

// POST /api/storage/disconnect - Disconnect a storage account (NOT authentication)
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()

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

    // Prevent disconnecting if it's the only login method
    if (hasOtherLoginMethods === 0) {
      return NextResponse.json({ 
        error: "Cannot disconnect your only login method. Please add another login method first.",
        cannotDisconnect: true
      }, { status: 400 })
    }

    // Use a transaction to update storage accounts only (keep OAuth for login)
    const result = await prisma.$transaction(async (tx) => {
      // Update storage accounts to DISCONNECTED (but keep OAuth account for login)
      const storageProvider = provider === "google" ? "GOOGLE_DRIVE" : "DROPBOX"
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

      // Check for affected portals that might become non-functional
      const affectedPortals = await tx.uploadPortal.findMany({
        where: {
          userId: session.user.id,
          storageProvider: provider === "google" ? "google_drive" : "dropbox"
        },
        select: {
          id: true,
          name: true,
          storageProvider: true
        }
      })

      return {
        updatedStorageAccounts: storageUpdateResult.count,
        affectedPortals
      }
    })

    let message = `Disconnected ${provider} storage access. You can still log in with ${provider}, but files won't be stored there.`
    
    if (result.affectedPortals.length > 0) {
      const portalNames = result.affectedPortals.map(p => p.name).join(", ")
      message += ` Note: ${result.affectedPortals.length} portal(s) (${portalNames}) may be affected and might need reconfiguration.`
    }

    return NextResponse.json({ 
      success: true, 
      message,
      affectedPortals: result.affectedPortals.length,
      storageDisconnected: true,
      authPreserved: true
    })
  } catch (error) {
    console.error("Error disconnecting storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
