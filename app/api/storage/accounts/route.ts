import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getConnectedAccounts } from "@/lib/storage"
import { ensureUserStorageAccounts } from "@/lib/storage/middleware-fallback"

// GET /api/storage/accounts - Get connected storage accounts
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
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

    const accounts = await getConnectedAccounts(session.user.id)

    return NextResponse.json({
      accounts,
      fallbackInfo: {
        accountsCreated: fallbackResult.created,
        errors: fallbackResult.errors
      }
    })
  } catch (error) {
    console.error("Error fetching storage accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

