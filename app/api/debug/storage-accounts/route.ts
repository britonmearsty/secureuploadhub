import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// GET /api/debug/storage-accounts - Debug storage accounts for current user
export async function GET() {
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
          },
          select: {
            provider: true,
            providerAccountId: true,
            access_token: true,
            refresh_token: true,
            expires_at: true,
            createdAt: true
          }
        },
        storageAccounts: {
          where: {
            provider: { in: ['google_drive', 'dropbox'] }
          },
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            email: true,
            displayName: true,
            status: true,
            isActive: true,
            lastError: true,
            createdAt: true,
            updatedAt: true,
            lastAccessedAt: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Process OAuth accounts
    const oauthAccounts = user.accounts.map(account => {
      const hasToken = !!account.access_token
      const hasRefresh = !!account.refresh_token
      const isExpired = account.expires_at ? account.expires_at < Math.floor(Date.now() / 1000) : false
      
      return {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        hasAccessToken: hasToken,
        hasRefreshToken: hasRefresh,
        tokenExpired: isExpired,
        createdAt: account.createdAt
      }
    })

    // Process storage accounts
    const storageAccounts = user.storageAccounts.map(storage => ({
      id: storage.id,
      provider: storage.provider,
      providerAccountId: storage.providerAccountId,
      email: storage.email,
      displayName: storage.displayName,
      status: storage.status,
      isActive: storage.isActive,
      lastError: storage.lastError,
      createdAt: storage.createdAt,
      updatedAt: storage.updatedAt,
      lastAccessedAt: storage.lastAccessedAt
    }))

    // Check for mismatches
    const oauthProviders = user.accounts.map(a => a.provider === 'google' ? 'google_drive' : 'dropbox')
    const storageProviders = user.storageAccounts.map(s => s.provider)
    
    const missingStorage = oauthProviders.filter(p => !storageProviders.includes(p))
    const orphanedStorage = storageProviders.filter(p => !oauthProviders.includes(p as "google_drive" | "dropbox"))

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      oauthAccounts,
      storageAccounts,
      analysis: {
        totalOAuthAccounts: oauthAccounts.length,
        totalStorageAccounts: storageAccounts.length,
        activeStorageAccounts: storageAccounts.filter(s => s.status === 'ACTIVE').length,
        inactiveStorageAccounts: storageAccounts.filter(s => s.status === 'INACTIVE').length,
        missingStorageAccounts: missingStorage,
        orphanedStorageAccounts: orphanedStorage,
        issues: [
          ...missingStorage.map(p => `Missing storage account for ${p}`),
          ...orphanedStorage.map(p => `Orphaned storage account for ${p}`)
        ]
      }
    })

  } catch (error) {
    console.error('Debug storage accounts error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}