// Cloud storage service types and interfaces

export type StorageProvider = "local" | "google_drive" | "dropbox"

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
   * Upload a file to the cloud storage
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
   * List folders in the storage
   */
  listFolders(
    accessToken: string,
    parentFolderId?: string
  ): Promise<StorageFolder[]>
  
  /**
   * Create a folder in the storage
   */
  createFolder(
    accessToken: string,
    folderName: string,
    parentFolderId?: string
  ): Promise<StorageFolder>
  
  /**
   * Refresh the access token
   */
  refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt?: number }>
  
  /**
   * Get account info (email, name)
   */
  getAccountInfo(
    accessToken: string
  ): Promise<{ email?: string; name?: string }>
}

