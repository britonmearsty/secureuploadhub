import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { validateStorageConnection } from "@/lib/storage"
import { StorageAccountStatus } from "@/lib/storage/account-states"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all active storage accounts for the user
    const storageAccounts = await prisma.storageAccount.findMany({
      where: {
        userId: session.user.id,
        status: { in: [StorageAccountStatus.ACTIVE, StorageAccountStatus.INACTIVE] }
      }
    })

    const results = []

    for (const account of storageAccounts) {
      const provider = account.provider === "GOOGLE_DRIVE" ? "google_drive" : "dropbox"
      
      // Test the connection
      const validation = await validateStorageConnection(session.user.id, provider)
      
      if (!validation.isValid) {
        // Update status to DISCONNECTED if validation failed
        await prisma.storageAccount.update({
          where: { id: account.id },
          data: {
            status: StorageAccountStatus.DISCONNECTED,
            lastError: validation.error || "Connection validation failed",
            updatedAt: new Date()
          }
        })

        results.push({
          accountId: account.id,
          provider: account.provider,
          previousStatus: account.status,
          newStatus: StorageAccountStatus.DISCONNECTED,
          error: validation.error
        })
      } else {
        // Connection is valid, ensure status is ACTIVE
        if (account.status !== StorageAccountStatus.ACTIVE) {
          await prisma.storageAccount.update({
            where: { id: account.id },
            data: {
              status: StorageAccountStatus.ACTIVE,
              lastError: null,
              updatedAt: new Date()
            }
          })

          results.push({
            accountId: account.id,
            provider: account.provider,
            previousStatus: account.status,
            newStatus: StorageAccountStatus.ACTIVE,
            error: null
          })
        } else {
          results.push({
            accountId: account.id,
            provider: account.provider,
            previousStatus: account.status,
            newStatus: account.status,
            error: null
          })
        }
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