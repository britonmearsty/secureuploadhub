import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { diagnoseGoogleDriveConnections, fixAllGoogleDriveConnections, fixGoogleDriveConnection } from "@/scripts/fix-google-drive-connection"

// GET /api/admin/fix-google-drive - Diagnose Google Drive connection issues
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await (await import("@/lib/prisma")).default.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log(`🔍 ADMIN_GOOGLE_FIX: Admin ${session.user.email} requested Google Drive diagnosis`)

    const diagnostics = await diagnoseGoogleDriveConnections()
    
    const summary = {
      totalUsers: diagnostics.length,
      usersWithIssues: diagnostics.filter(d => d.issue).length,
      issueBreakdown: {
        missingStorageAccount: diagnostics.filter(d => d.issue === 'MISSING_STORAGE_ACCOUNT').length,
        disconnectedStorageAccount: diagnostics.filter(d => d.issue === 'DISCONNECTED_STORAGE_ACCOUNT').length,
        noOAuthAccount: diagnostics.filter(d => d.issue === 'NO_OAUTH_ACCOUNT').length,
        expiredToken: diagnostics.filter(d => d.issue === 'EXPIRED_TOKEN_NO_REFRESH').length,
      },
      healthyConnections: diagnostics.filter(d => !d.issue).length
    }

    return NextResponse.json({
      success: true,
      summary,
      diagnostics: diagnostics.map(d => ({
        userId: d.userId,
        userEmail: d.userEmail,
        issue: d.issue,
        hasGoogleOAuth: d.hasGoogleOAuth,
        hasGoogleStorage: d.hasGoogleStorage,
        storageStatus: d.googleStorageDetails?.status,
        oauthValid: d.googleOAuthDetails && !d.googleOAuthDetails.isExpired
      }))
    })

  } catch (error) {
    console.error("❌ ADMIN_GOOGLE_FIX: Diagnosis failed:", error)
    return NextResponse.json({ 
      error: "Failed to diagnose Google Drive connections",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/admin/fix-google-drive - Fix Google Drive connection issues
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await (await import("@/lib/prisma")).default.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, fixAll } = body

    console.log(`🔧 ADMIN_GOOGLE_FIX: Admin ${session.user.email} requested Google Drive fix`, {
      userId,
      fixAll
    })

    if (fixAll) {
      // Fix all Google Drive connections
      const result = await fixAllGoogleDriveConnections()
      
      return NextResponse.json({
        success: true,
        message: `Fixed ${result.fixedUsers}/${result.totalUsers} Google Drive connections`,
        summary: {
          totalUsers: result.totalUsers,
          fixedUsers: result.fixedUsers,
          failedUsers: result.failedUsers
        },
        results: result.results
      })
    } else if (userId) {
      // Fix specific user's Google Drive connection
      const result = await fixGoogleDriveConnection(userId)
      
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? `Successfully fixed Google Drive connection (${result.action})`
          : `Failed to fix Google Drive connection: ${result.error}`,
        result: {
          userId,
          fixed: result.success,
          action: result.action,
          storageAccountId: result.storageAccountId,
          error: result.error
        }
      })
    } else {
      return NextResponse.json({ 
        error: "Either 'userId' or 'fixAll: true' must be provided" 
      }, { status: 400 })
    }

  } catch (error) {
    console.error("❌ ADMIN_GOOGLE_FIX: Fix operation failed:", error)
    return NextResponse.json({ 
      error: "Failed to fix Google Drive connections",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}