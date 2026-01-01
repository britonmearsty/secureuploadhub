import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listCloudFolders, createCloudFolder, StorageProvider } from "@/lib/storage"

// GET /api/storage/folders - List folders in cloud storage
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const provider = searchParams.get("provider") as StorageProvider
    const parentFolderId = searchParams.get("parentFolderId") || undefined
    const rootOnly = searchParams.get("rootOnly") === "true"

    if (!provider || (provider !== "google_drive" && provider !== "dropbox")) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    if (rootOnly) {
      const { getOrCreateRootFolder } = await import("@/lib/storage")
      const root = await getOrCreateRootFolder(session.user.id, provider)
      return NextResponse.json(root)
    }

    const folders = await listCloudFolders(session.user.id, provider, parentFolderId)

    return NextResponse.json(folders)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Error listing folders:", message)

    if (message.includes("missing_scope")) {
      return NextResponse.json({
        error: "Your cloud storage permissions are incomplete. Please reconnect your account in settings to grant the necessary permissions."
      }, { status: 401 })
    }

    if (message.includes("token") || message.includes("Unauthorized")) {
      return NextResponse.json({
        error: "Your cloud storage connection has expired. Please reconnect your account in settings."
      }, { status: 401 })
    }

    return NextResponse.json({
      error: `Failed to list folders: ${message}`
    }, { status: 500 })
  }
}

// POST /api/storage/folders - Create a folder in cloud storage
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider, folderName, parentFolderId } = await request.json()

    if (!provider || (provider !== "google_drive" && provider !== "dropbox")) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    if (!folderName) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
    }

    const folder = await createCloudFolder(
      session.user.id,
      provider as StorageProvider,
      folderName,
      parentFolderId
    )

    if (!folder) {
      return NextResponse.json({ error: "Failed to create folder" }, { status: 500 })
    }

    return NextResponse.json(folder)
  } catch (error) {
    console.error("Error creating folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

