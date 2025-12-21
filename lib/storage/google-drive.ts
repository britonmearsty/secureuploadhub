// Google Drive storage service implementation

import { CloudStorageService, StorageFolder, UploadResult } from "./types"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3"
const GOOGLE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"

export class GoogleDriveService implements CloudStorageService {
  provider = "google_drive" as const

  async createResumableUpload(
    accessToken: string,
    fileName: string,
    mimeType: string,
    folderId?: string,
    folderPath?: string
  ): Promise<{ uploadUrl: string; fileId?: string }> {
    try {
      // If folderPath is provided but no folderId, create/find the folder
      let targetFolderId = folderId
      if (folderPath && !folderId) {
        targetFolderId = await this.ensureFolderPath(accessToken, folderPath)
      }

      const metadata: Record<string, unknown> = {
        name: fileName,
        mimeType: mimeType,
      }

      if (targetFolderId) {
        metadata.parents = [targetFolderId]
      }

      const response = await fetch(
        `${GOOGLE_UPLOAD_API}/files?uploadType=resumable`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": mimeType,
            // "X-Upload-Content-Length": fileSize.toString(), // Optional but good practice if known
          },
          body: JSON.stringify(metadata),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message || 
          `Failed to initiate resumable upload: ${response.status} ${response.statusText}`
        )
      }

      const uploadUrl = response.headers.get("Location")
      if (!uploadUrl) {
        throw new Error("No upload URL returned from Google Drive")
      }

      return { uploadUrl }
    } catch (error) {
      console.error("Google Drive resumable upload init error:", error)
      throw error
    }
  }

  async uploadFile(
    accessToken: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string,
    folderPath?: string
  ): Promise<UploadResult> {
    try {
      // If folderPath is provided but no folderId, create/find the folder
      let targetFolderId = folderId
      if (folderPath && !folderId) {
        targetFolderId = await this.ensureFolderPath(accessToken, folderPath)
      }

      // Create file metadata
      const metadata: Record<string, unknown> = {
        name: fileName,
        mimeType: mimeType,
      }
      
      if (targetFolderId) {
        metadata.parents = [targetFolderId]
      }

      // Use multipart upload for files
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2)
      
      const metadataString = JSON.stringify(metadata)
      
      // Build multipart body
      const bodyParts = [
        `--${boundary}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        metadataString,
        `\r\n--${boundary}\r\n`,
        `Content-Type: ${mimeType}\r\n\r\n`,
      ]
      
      const bodyStart = Buffer.from(bodyParts.join(''))
      const bodyEnd = Buffer.from(`\r\n--${boundary}--`)
      const body = Buffer.concat([bodyStart, file, bodyEnd])

      const response = await fetch(
        `${GOOGLE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: body,
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Google Drive upload error:", errorData)
        return {
          success: false,
          error: errorData.error?.message || "Failed to upload to Google Drive",
        }
      }

      const data = await response.json()
      return {
        success: true,
        fileId: data.id,
        fileName: data.name,
        webViewLink: data.webViewLink,
      }
    } catch (error) {
      console.error("Google Drive upload exception:", error)
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
      let query = "mimeType='application/vnd.google-apps.folder' and trashed=false"
      if (parentFolderId) {
        query += ` and '${parentFolderId}' in parents`
      } else {
        query += " and 'root' in parents"
      }

      const response = await fetch(
        `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Google Drive list folders error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error(
          errorData.error?.message || 
          `Google Drive API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.files.map((f: { id: string; name: string }) => ({
        id: f.id,
        name: f.name,
        path: f.name,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("Error listing Google Drive folders:", message)
      throw error
    }
  }

  async createFolder(
    accessToken: string,
    folderName: string,
    parentFolderId?: string
  ): Promise<StorageFolder> {
    const metadata: Record<string, unknown> = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }

    if (parentFolderId) {
      metadata.parents = [parentFolderId]
    }

    const response = await fetch(`${GOOGLE_DRIVE_API}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    })

    if (!response.ok) {
      throw new Error("Failed to create folder")
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      path: folderName,
    }
  }

  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt?: number }> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to refresh Google access token")
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
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
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
      name: data.name,
    }
  }

  /**
   * Ensure a folder path exists, creating folders as needed
   * Returns the ID of the deepest folder
   */
  private async ensureFolderPath(
    accessToken: string,
    folderPath: string
  ): Promise<string> {
    const parts = folderPath.split("/").filter(Boolean)
    let parentId: string | undefined = undefined

    for (const folderName of parts) {
      // Try to find existing folder
      const folders = await this.listFolders(accessToken, parentId)
      const existing = folders.find(
        (f) => f.name.toLowerCase() === folderName.toLowerCase()
      )

      if (existing) {
        parentId = existing.id
      } else {
        // Create the folder
        const newFolder = await this.createFolder(accessToken, folderName, parentId)
        parentId = newFolder.id
      }
    }

    return parentId || "root"
  }
}

export const googleDriveService = new GoogleDriveService()

