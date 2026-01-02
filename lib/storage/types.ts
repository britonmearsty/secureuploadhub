// Cloud storage service types and interfaces

export type StorageProvider = "google_drive" | "dropbox"

export interface StorageFile {
  id: string
  name: string
  mimeType: string
  size: number
  webViewLink?: string
  downloadLink?: string
}

export interface StorageFolder {
  id: string
  name: string
  path: string
}

export interface UploadResult {
  success: boolean
  fileId?: string
  fileName?: string
  webViewLink?: string
  error?: string
}

export interface StorageAccount {
  provider: StorageProvider
  providerAccountId: string
  email?: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

export interface CloudStorageService {
  provider: StorageProvider

  /**
   * Initiate a resumable upload session
   * Returns an upload URL that the client can PUT to directly
   */
  createResumableUpload?(
    accessToken: string,
    fileName: string,
    mimeType: string,
    folderId?: string,
    folderPath?: string,
    origin?: string
  ): Promise<{ uploadUrl: string; fileId?: string }>

  /**
   * Upload a file directly (non-resumable)
   */
  uploadFile(
    accessToken: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string,
    folderPath?: string
  ): Promise<UploadResult>

  /**
   * List folders in a directory
   */
  listFolders(
    accessToken: string,
    parentFolderId?: string
  ): Promise<StorageFolder[]>

  /**
   * Create a new folder
   */
  createFolder(
    accessToken: string,
    folderName: string,
    parentFolderId?: string
  ): Promise<StorageFolder>

  /**
   * Rename a folder
   */
  renameFolder?(
    accessToken: string,
    folderId: string,
    newName: string
  ): Promise<{ success: boolean; folder?: StorageFolder; error?: string }>

  /**
   * Delete a folder
   */
  deleteFolder?(
    accessToken: string,
    folderId: string
  ): Promise<{ success: boolean; error?: string }>

  /**
   * Download a file from storage
   */
  downloadFile?(
    accessToken: string,
    fileId: string
  ): Promise<{ data: ReadableStream | Buffer; mimeType: string; fileName: string }>

  /**
   * Delete a file from storage
   */
  deleteFile?(
    accessToken: string,
    fileId: string
  ): Promise<{ success: boolean; error?: string }>

  /**
   * Get account information
   */
  getAccountInfo?(accessToken: string): Promise<{
    email?: string
    name?: string
  }>

  /**
   * Refresh an expired access token
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    expiresAt?: number
  }>
}