import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// GET /api/uploads - List recent uploads for the current user's portals
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    const portalId = searchParams.get("portalId")

    // Get all portal IDs owned by this user
    const userPortals = await prisma.uploadPortal.findMany({
      where: { userId: session.user.id },
      select: { id: true }
    })

    const portalIds = userPortals.map((p: { id: string }) => p.id)

    if (portalIds.length === 0) {
      return NextResponse.json([])
    }

    // Build where clause
    const whereClause: {
      portalId: { in: string[] } | string
    } = {
      portalId: portalId && portalIds.includes(portalId) 
        ? portalId 
        : { in: portalIds }
    }

    const uploads = await prisma.fileUpload.findMany({
      where: whereClause,
      include: {
        portal: {
          select: {
            name: true,
            slug: true,
            primaryColor: true,
          }
        },
        storageAccount: {
          select: {
            id: true,
            status: true,
            provider: true,
            displayName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })

    return NextResponse.json(uploads)
  } catch (error) {
    console.error("Error fetching uploads:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

