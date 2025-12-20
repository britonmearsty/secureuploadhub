import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getConnectedAccounts } from "@/lib/storage"

// GET /api/storage/accounts - Get connected storage accounts
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accounts = await getConnectedAccounts(session.user.id)

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("Error fetching storage accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

