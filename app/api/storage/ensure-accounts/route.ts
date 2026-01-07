import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { StorageAccountManager } from "@/lib/storage/storage-account-manager"

/**
 * POST /api/storage/ensure-accounts - Ensure StorageAccount records exist for OAuth accounts
 * 
 * ENHANCED VERSION: Better error handling and comprehensive reporting
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { allUsers = false } = body

    // Check if user is admin for all users operation
    if (allUsers) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })

      if (user?.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }

      // Process all users - this would need to be implemented in StorageAccountManager
      // For now, return an error suggesting to process users individually
      return NextResponse.json({
        error: "Batch processing not yet implemented in new system. Please process users individually.",
        suggestion: "Use individual user processing for now"
      }, { status: 501 })
    } else {
      // Process current user only with enhanced reporting
      const result = await StorageAccountManager.ensureStorageAccountsForUser(session.user.id, {
        forceCreate: false,
        respectDisconnected: true
      })
      
      return NextResponse.json({
        success: true,
        message: "Processed current user",
        accountsCreated: result.created,
        accountsValidated: result.validated,
        accountsReactivated: result.reactivated,
        errors: result.errors,
        details: result.details
      })
    }

  } catch (error) {
    console.error("Ensure storage accounts failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}