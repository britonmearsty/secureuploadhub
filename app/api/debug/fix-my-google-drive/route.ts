import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { fixGoogleDriveConnection } from "@/scripts/fix-google-drive-connection"

// POST /api/debug/fix-my-google-drive - Fix current user's Google Drive connection
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔧 DEBUG_GOOGLE_FIX: User ${session.user.email} requested Google Drive connection fix`)

    const result = await fixGoogleDriveConnection(session.user.id)
    
    if (result.success) {
      console.log(`✅ DEBUG_GOOGLE_FIX: Successfully fixed Google Drive for ${session.user.email}`)
      
      return NextResponse.json({
        success: true,
        message: `Google Drive connection fixed successfully!`,
        details: {
          action: result.action,
          storageAccountId: result.storageAccountId
        }
      })
    } else {
      console.log(`❌ DEBUG_GOOGLE_FIX: Failed to fix Google Drive for ${session.user.email}: ${result.error}`)
      
      return NextResponse.json({
        success: false,
        message: `Failed to fix Google Drive connection`,
        error: result.error,
        action: result.action
      }, { status: 400 })
    }

  } catch (error) {
    console.error("❌ DEBUG_GOOGLE_FIX: Exception during fix:", error)
    return NextResponse.json({ 
      error: "Internal server error during Google Drive fix",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/debug/fix-my-google-drive - Check current user's Google Drive connection status
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = (await import("@/lib/prisma")).default
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: {
          where: { provider: 'google' }
        },
        storageAccounts: {
          where: { provider: 'google_drive' }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const googleOAuth = user.accounts[0]
    const googleStorage = user.storageAccounts[0]

    const status = {
      userEmail: user.email,
      hasGoogleOAuth: !!googleOAuth,
      hasGoogleStorage: !!googleStorage,
      googleOAuthDetails: googleOAuth ? {
        providerAccountId: googleOAuth.providerAccountId,
        hasAccessToken: !!googleOAuth.access_token,
        hasRefreshToken: !!googleOAuth.refresh_token,
        isExpired: googleOAuth.expires_at ? googleOAuth.expires_at < Math.floor(Date.now() / 1000) : false
      } : null,
      googleStorageDetails: googleStorage ? {
        id: googleStorage.id,
        status: googleStorage.status,
        email: googleStorage.email,
        displayName: googleStorage.displayName
      } : null,
      needsFix: false,
      issue: null as string | null
    }

    // Determine if fix is needed
    if (googleOAuth && !googleStorage) {
      status.needsFix = true
      status.issue = "MISSING_STORAGE_ACCOUNT"
    } else if (googleOAuth && googleStorage && googleStorage.status !== 'ACTIVE') {
      status.needsFix = true
      status.issue = "DISCONNECTED_STORAGE_ACCOUNT"
    } else if (!googleOAuth) {
      status.needsFix = true
      status.issue = "NO_OAUTH_ACCOUNT"
    }

    return NextResponse.json({
      success: true,
      status,
      recommendation: status.needsFix 
        ? `Issue detected: ${status.issue}. Call POST /api/debug/fix-my-google-drive to fix.`
        : "Google Drive connection is healthy!"
    })

  } catch (error) {
    console.error("❌ DEBUG_GOOGLE_FIX: Status check failed:", error)
    return NextResponse.json({ 
      error: "Failed to check Google Drive status",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}