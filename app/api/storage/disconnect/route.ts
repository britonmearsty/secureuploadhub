import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/storage/disconnect - Disconnect a storage account
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()

    if (!provider || !["google", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    // Delete the account connection
    const result = await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider
      }
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: `Disconnected from ${provider}` })
  } catch (error) {
    console.error("Error disconnecting account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
