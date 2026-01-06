import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@/lib/storage/account-states"

// POST /api/storage/disconnect - Disconnect a storage account
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

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Delete the OAuth account connection
      const deleteResult = await tx.account.deleteMany({
        where: {
          userId: session.user.id,
          provider
        }
      })

      if (deleteResult.count === 0) {
        throw new Error("Account not found")
      }

      // Update corresponding storage accounts to DISCONNECTED status
      const storageProvider = provider === "google" ? "GOOGLE_DRIVE" : "DROPBOX"
      const storageUpdateResult = await tx.storageAccount.updateMany({
        where: {
          userId: session.user.id,
          provider: storageProvider
        },
        data: {
          status: StorageAccountStatus.DISCONNECTED,
          lastError: "Account disconnected by user",
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
        deletedAccounts: deleteResult.count,
        updatedStorageAccounts: storageUpdateResult.count,
        affectedPortals
      }
    })

    let message = `Disconnected from ${provider}. Files from this account will now show as unavailable.`
    
    if (result.affectedPortals.length > 0) {
      const portalNames = result.affectedPortals.map(p => p.name).join(", ")
      message += ` Note: ${result.affectedPortals.length} portal(s) (${portalNames}) may be affected and might need reconfiguration.`
    }

    return NextResponse.json({ 
      success: true, 
      message,
      affectedPortals: result.affectedPortals.length
    })
  } catch (error) {
    console.error("Error disconnecting account:", error)
    
    if (error instanceof Error && error.message === "Account not found") {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
