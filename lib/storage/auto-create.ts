/**
 * Automatic StorageAccount Creation
 * Ensures StorageAccount records are created when OAuth accounts are established
 */

import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@prisma/client"

/**
 * Create StorageAccount record for an OAuth account
 */
export async function createStorageAccountForOAuth(
  userId: string,
  account: {
    provider: string
    providerAccountId: string
  },
  userEmail: string | null,
  userName: string | null
): Promise<boolean> {
  // Only create storage accounts for storage providers
  if (!["google", "dropbox"].includes(account.provider)) {
    return false
  }

  const storageProvider = account.provider === "google" ? "google_drive" : "dropbox"
  
  try {
    // Check if StorageAccount already exists
    const existingStorageAccount = await prisma.storageAccount.findUnique({
      where: {
        userId_providerAccountId_provider: {
          userId,
          providerAccountId: account.providerAccountId,
          provider: storageProvider
        }
      }
    })

    if (existingStorageAccount) {
      console.log(`StorageAccount already exists for ${storageProvider} (user: ${userEmail})`)
      return false
    }

    // Create new StorageAccount
    await prisma.storageAccount.create({
      data: {
        userId,
        provider: storageProvider,
        providerAccountId: account.providerAccountId,
        displayName: userName || userEmail || "Unknown",
        email: userEmail,
        status: StorageAccountStatus.ACTIVE,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Created StorageAccount for ${storageProvider} (user: ${userEmail})`)
    return true
  } catch (error) {
    console.error(`❌ Failed to create StorageAccount for ${storageProvider}:`, error)
    return false
  }
}

/**
 * Ensure all OAuth accounts have corresponding StorageAccount records
 * This is a fallback function that can be called to fix missing StorageAccounts
 */
export async function ensureStorageAccountsForUser(userId: string): Promise<{
  created: number
  errors: string[]
}> {
  const result: {
    created: number
    errors: string[]
  } = {
    created: 0,
    errors: []
  }

  try {
    // Get user with OAuth accounts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          where: {
            provider: { in: ["google", "dropbox"] }
          }
        }
      }
    })

    if (!user) {
      result.errors.push("User not found")
      return result
    }

    // Create StorageAccount for each OAuth account that doesn't have one
    for (const account of user.accounts) {
      const created = await createStorageAccountForOAuth(
        userId,
        {
          provider: account.provider,
          providerAccountId: account.providerAccountId
        },
        user.email,
        user.name
      )

      if (created) {
        result.created++
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown error")
  }

  return result
}

/**
 * Batch ensure StorageAccounts for all users with OAuth accounts
 */
export async function ensureStorageAccountsForAllUsers(): Promise<{
  usersProcessed: number
  accountsCreated: number
  errors: string[]
}> {
  const result: {
    usersProcessed: number
    accountsCreated: number
    errors: string[]
  } = {
    usersProcessed: 0,
    accountsCreated: 0,
    errors: []
  }

  try {
    // Find users with OAuth accounts
    const users = await prisma.user.findMany({
      where: {
        accounts: {
          some: {
            provider: { in: ["google", "dropbox"] }
          }
        }
      },
      include: {
        accounts: {
          where: {
            provider: { in: ["google", "dropbox"] }
          }
        }
      }
    })

    for (const user of users) {
      const userResult = await ensureStorageAccountsForUser(user.id)
      result.usersProcessed++
      result.accountsCreated += userResult.created
      result.errors.push(...userResult.errors)
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown error")
  }

  return result
}