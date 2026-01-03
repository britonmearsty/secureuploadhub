import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getStorageService, getValidAccessToken } from "@/lib/storage"

// PATCH /api/storage/folders/[id] - Rename a folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, provider } = await request.json()
    const { id: folderId } = await params

    if (!name || !provider) {
      return NextResponse.json({ error: "Name and provider are required" }, { status: 400 })
    }

    // Get storage service
    const service = getStorageService(provider)
    if (!service) {
      return NextResponse.json({ error: "Invalid storage provider" }, { status: 400 })
    }

    // Get valid access token
    const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
    const tokenData = await getValidAccessToken(session.user.id, oauthProvider)
    if (!tokenData) {
      return NextResponse.json({ error: "Storage account not connected" }, { status: 400 })
    }

    // Rename folder using storage service
    if (service.renameFolder) {
      const result = await service.renameFolder(tokenData.accessToken, folderId, name)
      if (result.success) {
        return NextResponse.json({ success: true, folder: result.folder })
      } else {
        return NextResponse.json({ error: result.error || "Failed to rename folder" }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: "Rename not supported for this provider" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error renaming folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/storage/folders/[id] - Delete a folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider")
    const { id: folderId } = await params

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 })
    }

    // Get storage service
    const service = getStorageService(provider as any)
    if (!service) {
      return NextResponse.json({ error: "Invalid storage provider" }, { status: 400 })
    }

    // Get valid access token
    const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
    const tokenData = await getValidAccessToken(session.user.id, oauthProvider)
    if (!tokenData) {
      return NextResponse.json({ error: "Storage account not connected" }, { status: 400 })
    }

    // Delete folder using storage service
    if (service.deleteFolder) {
      const result = await service.deleteFolder(tokenData.accessToken, folderId)
      if (result.success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ error: result.error || "Failed to delete folder" }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: "Delete not supported for this provider" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error deleting folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}