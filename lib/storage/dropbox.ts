// Dropbox storage service implementation

import { CloudStorageService, StorageFolder, UploadResult } from "./types"

const DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token"
const DROPBOX_API = "https://api.dropboxapi.com/2"
const DROPBOX_CONTENT_API = "https://content.dropboxapi.com/2"

export class DropboxService implements CloudStorageService {
  provider = "dropbox" as const

  async uploadFile(
    accessToken: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string,
    folderPath?: string
  ): Promise<UploadResult> {
    try {
      // Dropbox uses paths, not folder IDs
      // folderId here is actually the folder path
      const targetPath = folderPath || folderId || ""
      const fullPath = `${targetPath}/${fileName}`.replace(/\/+/g, "/")
      
      // Ensure path starts with /
      const normalizedPath = fullPath.startsWith("/") ? fullPath : `/${fullPath}`

      const response = await fetch(`${DROPBOX_CONTENT_API}/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path: normalizedPath,
            mode: "add",
            autorename: true,
            mute: false,
          }),
        },
        body: new Uint8Array(file),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Dropbox upload error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        
        let errorMessage = errorData.error_summary || "Failed to upload to Dropbox"
        if (errorData.error?.[".tag"] === "missing_scope" || errorMessage.includes("missing_scope")) {
          errorMessage = "Your Dropbox connection is missing required permissions. Please reconnect your account."
        }
        
        return {
          success: false,
          error: errorMessage,
        }
      }

      const data = await response.json()
      
      // Get a shared link for viewing
      let webViewLink: string | undefined
      try {
        const linkResponse = await fetch(
          `${DROPBOX_API}/sharing/create_shared_link_with_settings`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: data.path_display,
              settings: {
                requested_visibility: "team_only",
              },
            }),
          }
        )
        if (linkResponse.ok) {
          const linkData = await linkResponse.json()
          webViewLink = linkData.url
        }
      } catch {
        // Shared link creation is optional
      }

      return {
        success: true,
        fileId: data.id,
        fileName: data.name,
        webViewLink,
      }
    } catch (error) {
      console.error("Dropbox upload exception:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async listFolders(
    accessToken: string,
    parentFolderId?: string
  ): Promise<StorageFolder[]> {
    try {
      // Dropbox uses paths - parentFolderId is actually the path
      const path = parentFolderId || ""

      const response = await fetch(`${DROPBOX_API}/files/list_folder`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: path,
          recursive: false,
          include_mounted_folders: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Dropbox list_folder error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error(
          errorData.error_summary || 
          `Dropbox API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      
      // Filter to only folders
      return data.entries
        .filter((entry: { ".tag": string }) => entry[".tag"] === "folder")
        .map((f: { id: string; name: string; path_display: string }) => ({
          id: f.path_display, // Use path as ID for Dropbox
          name: f.name,
          path: f.path_display,
        }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("Error listing Dropbox folders:", message)
      throw error
    }
  }

  async createFolder(
    accessToken: string,
    folderName: string,
    parentFolderId?: string
  ): Promise<StorageFolder> {
    const parentPath = parentFolderId || ""
    const fullPath = `${parentPath}/${folderName}`.replace(/\/+/g, "/")
    const normalizedPath = fullPath.startsWith("/") ? fullPath : `/${fullPath}`

    const response = await fetch(`${DROPBOX_API}/files/create_folder_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: normalizedPath,
        autorename: false,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error_summary || "Failed to create folder")
    }

    const data = await response.json()
    return {
      id: data.metadata.path_display,
      name: data.metadata.name,
      path: data.metadata.path_display,
    }
  }

  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt?: number }> {
    const response = await fetch(DROPBOX_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DROPBOX_CLIENT_ID!,
        client_secret: process.env.DROPBOX_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to refresh Dropbox access token")
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : undefined,
    }
  }

  async getAccountInfo(
    accessToken: string
  ): Promise<{ email?: string; name?: string }> {
    const response = await fetch(
      `${DROPBOX_API}/users/get_current_account`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      return {}
    }

    const data = await response.json()
    return {
      email: data.email,
      name: data.name?.display_name,
    }
  }
}

export const dropboxService = new DropboxService()

