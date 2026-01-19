/**
 * Upload Utilities
 * Environment-specific upload configuration and helpers
 */

// Environment-specific file size limits
export const UPLOAD_LIMITS = {
  VERCEL_HOBBY: 4 * 1024 * 1024, // 4MB - Vercel request limit
  VERCEL_PRO: 45 * 1024 * 1024, // 45MB - Vercel request limit  
  LOCAL_DEV: 100 * 1024 * 1024, // 100MB - local development
  CHUNK_SIZE: 2 * 1024 * 1024, // 2MB - conservative size for reliable Vercel uploads
} as const

/**
 * Detect the deployment environment and return appropriate upload limits
 */
export function getUploadEnvironment() {
  if (typeof window === 'undefined') {
    // Server-side detection
    return {
      isVercel: !!process.env.VERCEL,
      isProduction: process.env.NODE_ENV === 'production',
      isPro: !!process.env.VERCEL_ENV && process.env.VERCEL_ENV === 'production',
    }
  }

  // Client-side detection
  const hostname = window.location.hostname
  return {
    isVercel: hostname.includes('vercel.app') || hostname.includes('vercel.com'),
    isProduction: hostname !== 'localhost' && !hostname.includes('127.0.0.1'),
    isPro: false, // Can't reliably detect Pro plan from client
  }
}

/**
 * Get the maximum file size for single (non-chunked) uploads
 */
export function getSingleUploadLimit(): number {
  const env = getUploadEnvironment()
  
  if (env.isVercel) {
    return env.isPro ? UPLOAD_LIMITS.VERCEL_PRO : UPLOAD_LIMITS.VERCEL_HOBBY
  }
  
  if (env.isProduction) {
    // Conservative limit for unknown production environments
    return UPLOAD_LIMITS.VERCEL_HOBBY
  }
  
  // Local development
  return UPLOAD_LIMITS.LOCAL_DEV
}

/**
 * Determine if a file should use chunked upload
 * Business grade: Use chunked upload for files that exceed single upload limits
 */
export function shouldUseChunkedUpload(fileSize: number): boolean {
  const singleUploadLimit = getSingleUploadLimit()
  return fileSize > singleUploadLimit
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get user-friendly error message for upload failures
 */
export function getUploadErrorMessage(error: string, fileSize: number): string {
  const fileSizeMB = Math.round(fileSize / (1024 * 1024))
  const env = getUploadEnvironment()
  
  if (error.includes('413') || error.includes('Request Entity Too Large')) {
    const limit = getSingleUploadLimit()
    const limitMB = Math.round(limit / (1024 * 1024))
    
    if (env.isVercel) {
      return `File too large (${fileSizeMB}MB) for Vercel deployment. Files over ${limitMB}MB should use chunked upload automatically. This suggests a configuration issue - please try again or contact support.`
    } else {
      return `File too large (${fileSizeMB}MB). Server limit is ${limitMB}MB. Please try a smaller file or contact support if this persists.`
    }
  }
  
  if (error.includes('timeout') || error.includes('Timeout')) {
    return `Upload timed out (${fileSizeMB}MB file). The server may be overloaded. Try uploading during off-peak hours or with a smaller file.`
  }
  
  if (error.includes('401') || error.includes('403')) {
    return 'Authentication failed. Please refresh the page and try again.'
  }
  
  if (error.includes('500')) {
    return `Server error while uploading ${fileSizeMB}MB file. Please try again or contact support if this persists.`
  }
  
  return error
}

/**
 * Log upload diagnostics for debugging
 */
export function logUploadDiagnostics(fileName: string, fileSize: number) {
  const env = getUploadEnvironment()
  const singleLimit = getSingleUploadLimit()
  const shouldChunk = shouldUseChunkedUpload(fileSize)
  
  console.log(`📊 Upload Diagnostics for ${fileName}:`, {
    fileSize: formatFileSize(fileSize),
    environment: env,
    singleUploadLimit: formatFileSize(singleLimit),
    shouldUseChunkedUpload: shouldChunk,
    chunkSize: formatFileSize(UPLOAD_LIMITS.CHUNK_SIZE),
  })
}