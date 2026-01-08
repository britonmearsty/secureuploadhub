import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { SingleEmailStorageManager } from "@/lib/storage/single-email-manager"

// POST /api/storage/reactivate - Reactivate storage access (same email account)
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

    // Check if user has OAuth access for this provider
    const hasOAuth = await SingleEmailStorageManager.hasOAuthAccess(
      session.user.id, 
      provider as "google" | "dropbox"
    )

    if (!hasOAuth) {
      return NextResponse.json({ 
        error: `No valid ${provider} access found. Please sign in with ${provider} first.`,
        needsOAuth: true
      }, { status: 400 })
    }

    // Reactivate the storage account (same email as login)
    const result = await SingleEmailStorageManager.reactivateStorageAccount(
      session.user.id,
      provider as "google" | "dropbox"
    )

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `${provider} storage reactivated for your account (${session.user.email}).`
      })
    } else {
      return NextResponse.json({ 
        error: result.error || `Failed to reactivate ${provider} storage`
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error reactivating storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}