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

    const userId = session.user.id // Extract to a variable for TypeScript

    // Use simplified connected accounts from single email manager
    console.log('🔍 STORAGE_ACCOUNTS_API: Getting simplified connected accounts...')
    const accounts = await SingleEmailStorageManager.getSimplifiedConnectedAccounts(userId)
    console.log('🔍 STORAGE_ACCOUNTS_API: Simplified accounts result:', {
      accountCount: accounts.length,
      accounts: accounts.map(a => ({
        provider: a.provider,
        email: a.email,
        status: a.status,
        isActive: a.isActive
      }))
    })

    // ENHANCED: Also check OAuth status for each account
    const enhancedAccounts = await Promise.all(
      accounts.map(async (account) => {
        const hasValidOAuth = await SingleEmailStorageManager.hasOAuthAccess(
          userId,
          account.provider as "google" | "dropbox"
        )
        console.log(`🔍 STORAGE_ACCOUNTS_API: ${account.provider} OAuth status: ${hasValidOAuth}`)
        
        return {
          provider: account.provider,
          providerAccountId: account.id, // Use storage account ID
          email: account.email,
          name: account.displayName,
          isConnected: account.isActive && hasValidOAuth, // Both must be true
          storageAccountId: account.id,
          storageStatus: account.status,
          isAuthAccount: true, // Since we enforce same email, this is always true
          hasValidOAuth // Show OAuth status separately
        }
      })
    )

    const response = {
      accounts: enhancedAccounts
    }
    
    console.log('✅ STORAGE_ACCOUNTS_API: Returning enhanced response:', {
      totalAccounts: enhancedAccounts.length,
      connectedAccounts: enhancedAccounts.filter(a => a.isConnected).length
    })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ STORAGE_ACCOUNTS_API: Error fetching storage accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

