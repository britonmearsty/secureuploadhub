import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { performStorageAccountHealthCheck } from "@/lib/storage/auto-create"

/**
 * POST /api/storage/comprehensive-health-check - Perform comprehensive storage account health check
 * 
 * This endpoint performs a complete audit and repair of storage accounts:
 * - Creates missing StorageAccount records
 * - Reactivates disconnected accounts where OAuth still exists
 * - Disconnects orphaned accounts where OAuth was revoked
 * - Provides detailed reporting of all actions taken
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

      // Perform health check for all users
      const result = await performStorageAccountHealthCheck()
      
      return NextResponse.json({
        success: true,
        message: "Comprehensive health check completed for all users",
        summary: result.summary,
        actions: result.actions,
        scope: "all_users"
      })
    } else {
      // Perform health check for current user only
      const result = await performStorageAccountHealthCheck(session.user.id)
      
      return NextResponse.json({
        success: true,
        message: "Comprehensive health check completed for current user",
        summary: result.summary,
        actions: result.actions,
        scope: "current_user"
      })
    }

  } catch (error) {
    console.error("Comprehensive health check failed:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}