import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getConnectedAccounts } from "@/lib/storage"
import { SingleEmailStorageManager } from "@/lib/storage/single-email-manager"
import { getActiveStorageAccountsForUser } from "@/lib/storage/data-integrity-helpers"

// GET /api/storage/accounts - Get connected storage accounts
export async function GET() {
  console.log('🔍 STORAGE_ACCOUNTS_API: GET request received')
  
  try {
    const session = await auth()
    console.log('🔍 STORAGE_ACCOUNTS_API: Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    })

    if (!session?.user?.id) {
      console.log('❌ STORAGE_ACCOUNTS_API: No session or user ID')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use simplified connected accounts from single email manager
    console.log('🔍 STORAGE_ACCOUNTS_API: Getting simplified connected accounts...')
    const accounts = await SingleEmailStorageManager.getSimplifiedConnectedAccounts(session.user.id)
    console.log('🔍 STORAGE_ACCOUNTS_API: Simplified accounts result:', {
      accountCount: accounts.length,
      accounts: accounts.map(a => ({
        provider: a.provider,
        email: a.email,
        status: a.status,
        isActive: a.isActive
      }))
    })

    const response = {
      accounts: accounts.map(account => ({
        provider: account.provider,
        providerAccountId: account.id, // Use storage account ID
        email: account.email,
        name: account.displayName,
        isConnected: account.isActive,
        storageAccountId: account.id,
        storageStatus: account.status,
        isAuthAccount: true, // Since we enforce same email, this is always true
        hasValidOAuth: account.isActive // Simplified: if storage is active, OAuth should be valid
      }))
    }
    
    console.log('✅ STORAGE_ACCOUNTS_API: Returning response')
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ STORAGE_ACCOUNTS_API: Error fetching storage accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

