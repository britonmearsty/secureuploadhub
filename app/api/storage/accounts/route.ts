import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getConnectedAccounts } from "@/lib/storage"
import { ensureStorageAccountsForUser } from "@/lib/storage/auto-create"

// GET /api/storage/accounts - Get connected storage accounts
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure StorageAccount records exist for all OAuth accounts (fallback mechanism)
    try {
      const { created } = await ensureStorageAccountsForUser(session.user.id)
      if (created > 0) {
        console.log(`✅ Created ${created} missing StorageAccount(s) for user ${session.user.id}`)
      }
    } catch (error) {
      console.error("Failed to ensure StorageAccounts:", error)
      // Continue even if this fails
    }

    const accounts = await getConnectedAccounts(session.user.id)

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("Error fetching storage accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

