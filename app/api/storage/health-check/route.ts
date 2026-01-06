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

    const results = []
    let createdAccounts = 0

    // Step 1: Check for missing StorageAccount records and create them
    const oauthAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        provider: { in: ["google", "dropbox"] }
      }
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true }
    })

    for (const oauthAccount of oauthAccounts) {
      const storageProvider = oauthAccount.provider === "google" ? "google_drive" : "dropbox"
      
      // Check if StorageAccount exists
      const existingStorageAccount = await prisma.storageAccount.findUnique({
        where: {
          userId_providerAccountId_provider: {
            userId: session.user.id,
            providerAccountId: oauthAccount.providerAccountId,
            provider: storageProvider
          }
        }
      })

      if (!existingStorageAccount) {
        // Create missing StorageAccount
        try {
          const newStorageAccount = await prisma.storageAccount.create({
            data: {
              userId: session.user.id,
              provider: storageProvider,
              providerAccountId: oauthAccount.providerAccountId,
              displayName: user?.name || user?.email || "Unknown",
              email: user?.email,
              status: StorageAccountStatus.ACTIVE,
              isActive: true,
              createdAt: oauthAccount.createdAt || new Date(),
              updatedAt: new Date()
            }
          })

          results.push({
            accountId: newStorageAccount.id,
            provider: storageProvider,
            action: "created",
            previousStatus: null,
            newStatus: StorageAccountStatus.ACTIVE,
            error: null
          })
          createdAccounts++
        } catch (error) {
          results.push({
            accountId: null,
            provider: storageProvider,
            action: "create_failed",
            previousStatus: null,
            newStatus: null,
            error: error instanceof Error ? error.message : "Unknown error"
          })
        }
      }
    }

    // Step 2: Validate existing storage accounts
    const storageAccounts = await prisma.storageAccount.findMany({
      where: {
        userId: session.user.id,
        status: { in: [StorageAccountStatus.ACTIVE, StorageAccountStatus.INACTIVE, StorageAccountStatus.ERROR] }
      }
    })

    for (const account of storageAccounts) {
      const provider = account.provider === "google_drive" ? "google_drive" : "dropbox"
      
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
          action: "disconnected",
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
              lastAccessedAt: new Date(),
              updatedAt: new Date()
            }
          })

          results.push({
            accountId: account.id,
            provider: account.provider,
            action: "reactivated",
            previousStatus: account.status,
            newStatus: StorageAccountStatus.ACTIVE,
            error: null
          })
        } else {
          results.push({
            accountId: account.id,
            provider: account.provider,
            action: "validated",
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
      createdAccounts,
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