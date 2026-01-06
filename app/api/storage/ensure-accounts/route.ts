import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { ensureStorageAccountsForUser, ensureStorageAccountsForAllUsers } from "@/lib/storage/auto-create"

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

      // Process all users with enhanced reporting
      const result = await ensureStorageAccountsForAllUsers()
      
      return NextResponse.json({
        success: true,
        message: "Processed all users",
        usersProcessed: result.usersProcessed,
        accountsCreated: result.accountsCreated,
        accountsReactivated: result.accountsReactivated,
        errors: result.errors,
        summary: result.summary
      })
    } else {
      // Process current user only with enhanced reporting
      const result = await ensureStorageAccountsForUser(session.user.id)
      
      return NextResponse.json({
        success: true,
        message: "Processed current user",
        accountsCreated: result.created,
        accountsValidated: result.validated,
        accountsReactivated: result.reactivated,
        errors: result.errors
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