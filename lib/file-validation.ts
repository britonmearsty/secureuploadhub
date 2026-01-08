/**
 * Enhanced file type validation utility
 * Handles MIME type validation with fallback to file extension matching
 */

interface FileValidationOptions {
  allowedTypes: string[]
  fileName: string
  mimeType: string
}

/**
 * Validates if a file is allowed based on MIME type and file extension
 * Supports wildcard types (e.g., "image/*") and handles edge cases like
 * missing MIME types or browser inconsistencies
 */
export function validateFileType(options: FileValidationOptions): boolean {
  const { allowedTypes, fileName, mimeType } = options
  
  // If no restrictions are set, allow all files
  if (!allowedTypes || allowedTypes.length === 0) {
    return true
  }
  
  // Get file extension for additional validation
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || ""
  
  return allowedTypes.some((allowedType) => {
    // Normalize allowed type to lowercase for case-insensitive comparison
    const normalizedAllowed = allowedType.toLowerCase()
    const normalizedMimeType = mimeType.toLowerCase()
    
    // Handle wildcard types (e.g., "image/*", "video/*")
    if (normalizedAllowed.endsWith("/*")) {
      const mainType = normalizedAllowed.split("/")[0]
      return normalizedMimeType.startsWith(mainType + "/")
    }
    
    // Handle exact MIME type match
    if (normalizedMimeType === normalizedAllowed) {
      return true
    }
    
    // Handle common file extension mappings for files with missing/incorrect MIME types
    const extensionMappings: Record<string, string[]> = {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/gif": ["gif"],
      "image/webp": ["webp"],
      "image/svg+xml": ["svg"],
      "application/pdf": ["pdf"],
      "text/plain": ["txt"],
      "text/markdown": ["md"],
      "text/javascript": ["js"],
      "text/typescript": ["ts"],
      "application/json": ["json"],
      "text/html": ["html"],
      "text/css": ["css"],
      "application/msword": ["doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
      "application/vnd.ms-excel": ["xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
      "application/vnd.ms-powerpoint": ["ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
      "application/zip": ["zip"],
      "application/x-rar-compressed": ["rar"],
      "application/x-7z-compressed": ["7z"],
      "video/mp4": ["mp4"],
      "video/avi": ["avi"],
      "video/quicktime": ["mov"],
      "audio/mpeg": ["mp3"],
      "audio/wav": ["wav"],
      "audio/ogg": ["ogg"]
    }
    
    // Check if the file extension matches any allowed MIME type
    const allowedExtensions = extensionMappings[normalizedAllowed] || []
    if (allowedExtensions.includes(fileExtension)) {
      return true
    }
    
    // Handle wildcard extension matching for broader categories
    if (normalizedAllowed.endsWith("/*")) {
      const mainType = normalizedAllowed.split("/")[0]
      const categoryExtensions: Record<string, string[]> = {
        "image": ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "ico"],
        "video": ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v"],
        "audio": ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"],
        "text": ["txt", "csv", "log", "md", "rtf", "js", "ts", "jsx", "tsx", "json", "xml", "html", "css"],
        "application": ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "7z"]
      }
      
      const categoryExts = categoryExtensions[mainType] || []
      if (categoryExts.includes(fileExtension)) {
        return true
      }
    }
    
    return false
  })
}

/**
 * Get user-friendly display name for a MIME type
 */
export function getFileTypeDisplayName(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Images'
  if (mimeType.startsWith('video/')) return 'Videos'
  if (mimeType.startsWith('audio/')) return 'Audio'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('document') || mimeType.includes('word')) return 'Documents'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheets'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentations'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'Archives'
  if (mimeType === 'text/plain') return 'Text files'
  return mimeType.split('/')[1]?.toUpperCase() || mimeType
}