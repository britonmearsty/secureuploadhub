import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { getCachedData, getUserDashboardKey, invalidateCache } from "@/lib/cache"

// GET /api/dashboard - Get all dashboard data in single optimized request
export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication with fresh user data validation
    const user = await getAuthenticatedUser();

    const userId = user.id
    const cacheKey = getUserDashboardKey(userId)

    const dashboardData = await getCachedData(
      cacheKey,
      async () => {
        console.log(`Fetching fresh dashboard data for user: ${userId}`)

        // Parallel queries for better performance
        const [portals, uploads] = await Promise.all([
          // Get portals with upload counts
          prisma.uploadPortal.findMany({
            where: { userId },
            include: {
              _count: {
                select: { uploads: true }
              }
            },
            orderBy: { createdAt: "desc" }
          }),
          // Get recent uploads (last 100 for stats calculation)
          prisma.fileUpload.findMany({
            where: {
              portal: {
                userId
              }
            },
            include: {
              portal: {
                select: {
                  name: true,
                  slug: true,
                  primaryColor: true,
                }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 100
          })
        ])

        // Calculate stats
        const activePortals = portals.filter((p: { isActive: boolean }) => p.isActive).length
        const totalUploads = uploads.length

        // Calculate recent uploads (last 7 days)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const recentUploads = uploads.filter((u: { createdAt: Date | string }) => new Date(u.createdAt) > weekAgo).length

        return {
          portals,
          uploads: uploads.slice(0, 10), // Only return last 10 for display
          stats: {
            totalPortals: portals.length,
            activePortals,
            totalUploads,
            recentUploads
          }
        }
      },
      300 // Cache for 5 minutes
    )

    return NextResponse.json(dashboardData)
  } catch (error) {
    // If error is already a NextResponse (from authentication), return it
    if (error instanceof NextResponse) {
      return error;
    }
    
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/dashboard/invalidate - Invalidate dashboard cache (for when data changes)
export async function POST(request: NextRequest) {
  try {
    // Enhanced authentication with fresh user data validation
    const user = await getAuthenticatedUser();

    const userId = user.id
    const cacheKey = getUserDashboardKey(userId)

    await invalidateCache(cacheKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    // If error is already a NextResponse (from authentication), return it
    if (error instanceof NextResponse) {
      return error;
    }
    
    console.error("Error invalidating dashboard cache:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}