import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { SingleEmailStorageManager } from "@/lib/storage/single-email-manager"
import prisma from "@/lib/prisma"

// POST /api/storage/reactivate - Reactivate storage access (same email account)
export async function POST(request: Request) {
  console.log('🔍 STORAGE_REACTIVATE: Request received')
  
  try {
    const session = await auth()
    console.log('🔍 STORAGE_REACTIVATE: Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id // Extract to a variable for TypeScript

    const { provider } = await request.json()
    console.log('🔍 STORAGE_REACTIVATE: Request data:', { provider })

    if (!provider || !["google", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    // Check if user has OAuth access for this provider
    console.log('🔍 STORAGE_REACTIVATE: Checking OAuth access...')
    const hasOAuth = await SingleEmailStorageManager.hasOAuthAccess(
      userId, 
      provider as "google" | "dropbox"
    )
    console.log('🔍 STORAGE_REACTIVATE: OAuth access result:', hasOAuth)

    if (!hasOAuth) {
      console.log('❌ STORAGE_REACTIVATE: No OAuth access found')
      return NextResponse.json({ 
        error: `No valid ${provider} access found. Please sign in with ${provider} first.`,
        needsOAuth: true
      }, { status: 400 })
    }

    // ENHANCED: Try auto-detect first to ensure storage account exists
    console.log('🔍 STORAGE_REACTIVATE: Running auto-detect to ensure storage account exists...')
    
    // Get the OAuth account to get the provider account ID
    const oauthAccount = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: provider
      },
      select: {
        providerAccountId: true
      }
    })
    
    if (!oauthAccount) {
      console.log('❌ STORAGE_REACTIVATE: No OAuth account found')
      return NextResponse.json({ 
        error: `No ${provider} OAuth account found. Please sign in with ${provider} first.`,
        needsOAuth: true
      }, { status: 400 })
    }
    
    const autoDetectResult = await SingleEmailStorageManager.autoDetectStorageAccount(
      userId,
      provider as "google" | "dropbox",
      oauthAccount.providerAccountId
    )
    
    console.log('🔍 STORAGE_REACTIVATE: Auto-detect result:', {
      success: autoDetectResult.success,
      created: autoDetectResult.created,
      updated: autoDetectResult.updated,
      error: autoDetectResult.error
    })

    // Reactivate the storage account (same email as login)
    console.log('🔍 STORAGE_REACTIVATE: Attempting reactivation...')
    const result = await SingleEmailStorageManager.reactivateStorageAccount(
      userId,
      provider as "google" | "dropbox"
    )
    
    console.log('🔍 STORAGE_REACTIVATE: Reactivation result:', {
      success: result.success,
      reactivatedCount: result.reactivatedCount,
      error: result.error
    })

    if (result.success) {
      console.log('✅ STORAGE_REACTIVATE: Success')
      return NextResponse.json({ 
        success: true, 
        message: `${provider} storage reactivated for your account (${session.user.email}).`,
        reactivatedCount: result.reactivatedCount
      })
    } else {
      console.log('❌ STORAGE_REACTIVATE: Failed:', result.error)
      return NextResponse.json({ 
        error: result.error || `Failed to reactivate ${provider} storage`
      }, { status: 400 })
    }
  } catch (error) {
    console.error("❌ STORAGE_REACTIVATE: Error reactivating storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}