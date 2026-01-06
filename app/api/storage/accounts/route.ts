import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getConnectedAccounts } from "@/lib/storage"
import { ensureUserStorageAccounts } from "@/lib/storage/middleware-fallback"

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

    // Enhanced fallback mechanism with comprehensive reporting
    const fallbackResult = await ensureUserStorageAccounts()
    
    if (fallbackResult.created > 0) {
      console.log(`✅ STORAGE_ACCOUNTS_API: Created ${fallbackResult.created} missing StorageAccount(s) for user ${session.user.id}`)
    }
    
    if (fallbackResult.errors.length > 0) {
      console.warn(`⚠️ STORAGE_ACCOUNTS_API: Fallback had errors:`, fallbackResult.errors)
    }

    console.log('🔍 STORAGE_ACCOUNTS_API: Calling getConnectedAccounts...')
    const accounts = await getConnectedAccounts(session.user.id)
    console.log('🔍 STORAGE_ACCOUNTS_API: getConnectedAccounts result:', {
      accountCount: accounts.length,
      accounts: accounts.map(a => ({
        provider: a.provider,
        isConnected: a.isConnected,
        hasValidOAuth: a.hasValidOAuth,
        storageStatus: a.storageStatus,
        email: a.email
      }))
    })

    const response = {
      accounts,
      fallbackInfo: {
        accountsCreated: fallbackResult.created,
        errors: fallbackResult.errors
      }
    }
    
    console.log('✅ STORAGE_ACCOUNTS_API: Returning response')
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ STORAGE_ACCOUNTS_API: Error fetching storage accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

