/**
 * Chunked Upload Handler
 * Splits large files into chunks and uploads in parallel
 */

import { getSingleUploadLimit, shouldUseChunkedUpload, logUploadDiagnostics, UPLOAD_LIMITS } from './upload-utils'

const CHUNK_SIZE = UPLOAD_LIMITS.CHUNK_SIZE
const MAX_PARALLEL_CHUNKS = 3 // Reduce to 3 for better reliability (was 6)

// Get timeout from environment or use defaults
// Business grade: Generous timeouts for large file processing
const CHUNK_TIMEOUT = parseInt(process.env.UPLOAD_TIMEOUT || '120000') // 2 minutes (business grade)
const SINGLE_FILE_TIMEOUT = parseInt(process.env.UPLOAD_TIMEOUT || '300000') // 5 minutes for large single files

export interface ChunkUploadProgress {
  chunkIndex: number
  totalChunks: number
  uploadedBytes: number
  totalBytes: number
  percentComplete: number
}

export interface ChunkUploadResult {
  success: boolean
  fileId?: string
  webViewLink?: string
  error?: string
}

/**
 * Split file into chunks
 */
export function createChunks(file: File, chunkSize: number = CHUNK_SIZE): Blob[] {
  const chunks: Blob[] = []
  const totalChunks = Math.ceil(file.size / chunkSize)

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    chunks.push(file.slice(start, end))
  }

  return chunks
}

/**
 * Upload file in parallel chunks
 * @param portalId - Upload portal ID
 * @param file - File to upload
 * @param clientInfo - Client metadata
 * @param accessToken - Optional auth token
 * @param onProgress - Progress callback
 * @param enableCompression - Enable client-side compression
 */
export async function uploadFileInChunks(
  portalId: string,
  file: File,
  clientInfo: {
    clientName?: string
    clientEmail?: string
    clientMessage?: string
  },
  accessToken?: string,
  onProgress?: (progress: ChunkUploadProgress) => void,
  enableCompression = true
): Promise<ChunkUploadResult> {
  // Optionally compress file before uploading
  let uploadFile = file
  if (enableCompression) {
    const { preprocessFile } = await import("@/lib/compression")
    uploadFile = await preprocessFile(file)
  }

  // Log diagnostics for debugging
  logUploadDiagnostics(uploadFile.name, uploadFile.size)

  const chunks = createChunks(uploadFile)
  const totalChunks = chunks.length

  // Use chunked upload if file size exceeds single upload limit
  // OR if the file would be split into multiple chunks anyway
  if (!shouldUseChunkedUpload(uploadFile.size) && totalChunks === 1) {
    console.log(`📤 Using single upload for ${uploadFile.name} (${uploadFile.size} bytes)`)
    return uploadSingleChunk(portalId, uploadFile, clientInfo, accessToken, onProgress)
  }

  console.log(`📦 Using chunked upload for ${uploadFile.name} (${totalChunks} chunks of ${CHUNK_SIZE} bytes each)`)

  const result = await attemptChunkedUpload(portalId, uploadFile, clientInfo, totalChunks, chunks, accessToken, onProgress)
  return result
}

/**
 * Attempt chunked upload with proper error handling
 */
async function attemptChunkedUpload(
  portalId: string,
  uploadFile: File,
  clientInfo: any,
  totalChunks: number,
  chunks: Blob[],
  accessToken?: string,
  onProgress?: (progress: ChunkUploadProgress) => void
): Promise<ChunkUploadResult> {
    // Initialize chunked upload session
    const sessionRes = await fetch("/api/upload/chunked/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portalId,
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
        totalChunks,
        ...clientInfo,
        token: accessToken,
      }),
    }).catch(err => {
      throw new Error(`Failed to connect to upload server: ${err.message}`)
    })

    if (!sessionRes.ok) {
      const error = await sessionRes.json().catch(() => ({ error: `HTTP ${sessionRes.status}: ${sessionRes.statusText}` }))
      return { success: false, error: error.error || `Failed to initialize upload (${sessionRes.status})` }
    }

    const session = await sessionRes.json()
    const uploadId = session.uploadId

    // Upload chunks in parallel batches (restored for speed)
    let uploadedBytes = 0
    const chunkResults = new Array(totalChunks)
    const errors: string[] = []

    for (let i = 0; i < totalChunks; i += MAX_PARALLEL_CHUNKS) {
      const batchEnd = Math.min(i + MAX_PARALLEL_CHUNKS, totalChunks)
      const batchPromises = []

      for (let j = i; j < batchEnd; j++) {
        batchPromises.push(
          uploadChunk(uploadId, j, chunks[j], uploadFile.name, totalChunks, accessToken)
            .then((result) => {
              chunkResults[j] = result
              uploadedBytes += chunks[j].size

              if (onProgress) {
                onProgress({
                  chunkIndex: j,
                  totalChunks,
                  uploadedBytes,
                  totalBytes: uploadFile.size,
                  percentComplete: Math.round((uploadedBytes / uploadFile.size) * 100),
                })
              }

              return result
            })
            .catch((err) => {
              errors.push(`Chunk ${j}: ${err instanceof Error ? err.message : 'Unknown error'}`)
              return null
            })
        )
      }

      const results = await Promise.allSettled(batchPromises)
      
      // Check for failed chunks in this batch
      for (let j = i; j < batchEnd; j++) {
        const resultIndex = j - i
        const result = results[resultIndex]
        
        if (result.status === 'rejected') {
          errors.push(`Chunk ${j}: ${result.reason instanceof Error ? result.reason.message : 'Upload failed'}`)
        } else if (!result.value) {
          errors.push(`Chunk ${j}: Upload returned null result`)
        }
      }
      
      if (errors.length > 0) {
        return { success: false, error: errors.join("; ") }
      }
    }

    // Validate all chunks were uploaded successfully before completing
    const successfulChunks = chunkResults.filter(result => result && result.success).length
    if (successfulChunks !== totalChunks) {
      return { 
        success: false, 
        error: `Upload incomplete: ${successfulChunks}/${totalChunks} chunks uploaded successfully. Missing chunks may cause completion failure.` 
      }
    }

    // Finalize upload
    const completeRes = await fetch("/api/upload/chunked/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        portalId,
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
        token: accessToken,
      }),
    }).catch(err => {
      throw new Error(`Failed to connect to upload server: ${err.message}`)
    })

    if (!completeRes.ok) {
      const error = await completeRes.json().catch(() => ({ error: `HTTP ${completeRes.status}: ${completeRes.statusText}` }))
      return { success: false, error: error.error || `Failed to complete upload (${completeRes.status})` }
    }

    const finalResult = await completeRes.json()
    return {
      success: true,
      fileId: finalResult.fileId,
      webViewLink: finalResult.webViewLink,
    }
}

/**
 * Upload a single chunk with streaming support and retry logic
 * Uses XMLHttpRequest for better streaming and progress tracking
 */
async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  chunk: Blob,
  fileName: string,
  totalChunks: number,
  accessToken?: string,
  retryCount = 0
): Promise<{ success: boolean; error?: string }> {
  const MAX_RETRIES = 3
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.onerror = () => {
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying chunk ${chunkIndex} (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        setTimeout(() => {
          uploadChunk(uploadId, chunkIndex, chunk, fileName, totalChunks, accessToken, retryCount + 1)
            .then(resolve)
            .catch(reject)
        }, 1000 * Math.pow(2, retryCount)) // Exponential backoff: 1s, 2s, 4s
      } else {
        reject(new Error(`Network error uploading chunk ${chunkIndex} after ${MAX_RETRIES} retries. Please check your internet connection.`))
      }
    }

    xhr.ontimeout = () => {
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying chunk ${chunkIndex} due to timeout (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        setTimeout(() => {
          uploadChunk(uploadId, chunkIndex, chunk, fileName, totalChunks, accessToken, retryCount + 1)
            .then(resolve)
            .catch(reject)
        }, 2000 * Math.pow(2, retryCount)) // Longer delay for timeouts: 2s, 4s, 8s
      } else {
        const timeoutMinutes = Math.round(CHUNK_TIMEOUT / 60000)
        reject(new Error(`Chunk upload timeout after ${timeoutMinutes} minute(s) (${MAX_RETRIES} retries). Please try again later.`))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true })
      } else {
        const error = (() => {
          try {
            const data = JSON.parse(xhr.responseText)
            return data.error || `Chunk upload failed: HTTP ${xhr.status} ${xhr.statusText}`
          } catch {
            return `Chunk upload failed: HTTP ${xhr.status} ${xhr.statusText}`
          }
        })()
        reject(new Error(error))
      }
    }

    const formData = new FormData()
    formData.append("uploadId", uploadId)
    formData.append("chunkIndex", chunkIndex.toString())
    formData.append("totalChunks", totalChunks.toString())
    formData.append("chunk", chunk, fileName)

    xhr.open("POST", "/api/upload/chunked/chunk")
    xhr.timeout = CHUNK_TIMEOUT
    if (accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    }
    xhr.send(formData)
  })
}

/**
 * Fallback: upload single file without chunking
 */
async function uploadSingleChunk(
  portalId: string,
  file: File,
  clientInfo: any,
  accessToken?: string,
  onProgress?: (progress: ChunkUploadProgress) => void
): Promise<ChunkUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    
    formData.append("file", file)
    formData.append("portalId", portalId)
    formData.append("clientName", clientInfo.clientName || "")
    formData.append("clientEmail", clientInfo.clientEmail || "")
    formData.append("clientMessage", clientInfo.clientMessage || "")
    if (accessToken) formData.append("token", accessToken)

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100)
        onProgress({
          chunkIndex: 0,
          totalChunks: 1,
          uploadedBytes: event.loaded,
          totalBytes: event.total,
          percentComplete,
        })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText)
          resolve({
            success: true,
            fileId: result.uploadId,
          })
        } catch (error) {
          reject(new Error("Invalid response from server"))
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          resolve({ success: false, error: error.error || `Upload failed (${xhr.status})` })
        } catch {
          resolve({ success: false, error: `HTTP ${xhr.status}: ${xhr.statusText}` })
        }
      }
    }

    xhr.onerror = () => {
      reject(new Error("Network error during upload. Please check your internet connection and try again."))
    }

    xhr.ontimeout = () => {
      const timeoutSeconds = Math.round(SINGLE_FILE_TIMEOUT / 1000)
      reject(new Error(`Upload timeout after ${timeoutSeconds} seconds. The server may be overloaded or your connection is slow. Please try again.`))
    }

    // Set timeout from environment configuration
    xhr.timeout = SINGLE_FILE_TIMEOUT

    // Set headers
    if (accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    }

    // Start upload
    xhr.open("POST", "/api/upload")
    xhr.send(formData)
  })
}
