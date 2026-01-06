import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getConnectedAccounts } from "@/lib/storage"
import { ensureStorageAccountsForUser } from "@/lib/storage/auto-create"

// GET /api/debug/storage-accounts - Debug storage accounts
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get raw data from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: {
          where: {
            provider: { in: ["google", "dropbox"] }
          }
        },
        storageAccounts: true
      }
    })

    // Get processed data from getConnectedAccounts
    const connectedAccounts = await getConnectedAccounts(session.user.id)

    // Try to ensure storage accounts
    const ensureResult = await ensureStorageAccountsForUser(session.user.id)

    return NextResponse.json({
      debug: {
        userId: session.user.id,
        userEmail: session.user.email,
        rawOAuthAccounts: user?.accounts || [],
        rawStorageAccounts: user?.storageAccounts || [],
        processedAccounts: connectedAccounts,
        ensureResult
      }
    })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}