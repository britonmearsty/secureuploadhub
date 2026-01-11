import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { SingleEmailStorageManager } from "@/lib/storage/single-email-manager"

// POST /api/storage/deactivate - Deactivate storage account (preserve for reactivation)
export async function POST(request: Request) {
  console.log('🔍 STORAGE_DEACTIVATE: Request received')
  
  try {
    const session = await auth()
    console.log('🔍 STORAGE_DEACTIVATE: Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()
    console.log('🔍 STORAGE_DEACTIVATE: Request data:', { provider })

    if (!provider || !["google", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    // Use single email manager to deactivate
    console.log('🔍 STORAGE_DEACTIVATE: Calling deactivateStorageAccount...')
    const result = await SingleEmailStorageManager.deactivateStorageAccount(
      session.user.id,
      provider as "google" | "dropbox"
    )
    console.log('🔍 STORAGE_DEACTIVATE: deactivateStorageAccount result:', result)

    if (result.success) {
      console.log('✅ STORAGE_DEACTIVATE: Success:', {
        deactivatedCount: result.deactivatedCount,
        deactivatedPortals: result.deactivatedPortals
      })

      let message = `${provider} storage deactivated. Your files are preserved and you can reactivate anytime.`
      if (result.deactivatedPortals && result.deactivatedPortals > 0) {
        message += ` ${result.deactivatedPortals} portal(s) have been automatically deactivated.`
      }

      return NextResponse.json({ 
        success: true, 
        message,
        deactivatedCount: result.deactivatedCount,
        deactivatedPortals: result.deactivatedPortals || 0
      })
    } else {
      console.log('❌ STORAGE_DEACTIVATE: Failed:', result.error)
      return NextResponse.json({ 
        error: result.error || "Failed to deactivate storage account" 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ STORAGE_DEACTIVATE: Error deactivating storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}