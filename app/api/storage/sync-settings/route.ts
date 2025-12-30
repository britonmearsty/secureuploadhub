import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

interface SyncSettingsInput {
  autoSync: boolean
  deleteAfterSync: boolean
  syncInterval: number
}

// GET /api/storage/sync-settings - Get user's sync settings
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const syncSettings = await prisma.syncSettings.findUnique({
      where: { userId: session.user.id }
    })

    // Return default settings if none exist
    if (!syncSettings) {
      return NextResponse.json({
        autoSync: true,
        deleteAfterSync: false,
        syncInterval: 3600
      })
    }

    return NextResponse.json(syncSettings)
  } catch (error) {
    console.error("Error fetching sync settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/storage/sync-settings - Update user's sync settings
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: SyncSettingsInput = await request.json()

    // Validate input
    if (typeof body.autoSync !== "boolean" || typeof body.deleteAfterSync !== "boolean") {
      return NextResponse.json({ error: "Invalid sync settings" }, { status: 400 })
    }

    if (!Number.isInteger(body.syncInterval) || body.syncInterval < 300) {
      return NextResponse.json(
        { error: "Sync interval must be at least 300 seconds (5 minutes)" },
        { status: 400 }
      )
    }

    // Upsert sync settings
    const syncSettings = await prisma.syncSettings.upsert({
      where: { userId: session.user.id },
      update: {
        autoSync: body.autoSync,
        deleteAfterSync: body.deleteAfterSync,
        syncInterval: body.syncInterval
      },
      create: {
        userId: session.user.id,
        autoSync: body.autoSync,
        deleteAfterSync: body.deleteAfterSync,
        syncInterval: body.syncInterval
      }
    })

    return NextResponse.json({
      success: true,
      message: "Sync settings updated",
      data: syncSettings
    })
  } catch (error) {
    console.error("Error updating sync settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
