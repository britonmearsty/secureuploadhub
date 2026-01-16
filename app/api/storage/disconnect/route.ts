import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { SingleEmailStorageManager } from "@/lib/storage/single-email-manager"

// POST /api/storage/disconnect - Disconnect storage account (removes OAuth and marks as DISCONNECTED)
export async function POST(request: Request) {
  console.log('🔍 STORAGE_DISCONNECT: Request received')
  
  try {
    const session = await auth()
    console.log('🔍 STORAGE_DISCONNECT: Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()
    console.log('🔍 STORAGE_DISCONNECT: Request data:', { provider })

    if (!provider || !["google", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    // Use single email manager to disconnect
    const result = await SingleEmailStorageManager.disconnectStorageAccount(
      session.user.id,
      provider as "google" | "dropbox"
    )

    if (result.success) {
      console.log('✅ STORAGE_DISCONNECT: Success:', {
        disconnectedCount: result.disconnectedCount,
        deactivatedPortals: result.deactivatedPortals
      })

      return NextResponse.json({ 
        success: true, 
        message: `${provider} storage disconnected successfully.`,
        disconnectedCount: result.disconnectedCount,
        deactivatedPortals: result.deactivatedPortals
      })
    } else {
      console.log('❌ STORAGE_DISCONNECT: Failed:', result.error)
      return NextResponse.json({ 
        error: result.error || "Failed to disconnect storage account" 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ STORAGE_DISCONNECT: Error disconnecting storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}