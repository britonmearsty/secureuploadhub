/**
 * Chunked Upload Handler
 * Splits large files into chunks and uploads in parallel
 */

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
const MAX_PARALLEL_CHUNKS = 4 // Upload 4 chunks in parallel

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

  const chunks = createChunks(uploadFile)
  const totalChunks = chunks.length

  // For small files, use standard upload (no chunking needed)
  if (totalChunks === 1) {
    return uploadSingleChunk(portalId, uploadFile, clientInfo, accessToken)
  }

  try {
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

    // Upload chunks in parallel batches
    let uploadedBytes = 0
    const chunkResults = new Array(totalChunks)
    const errors: string[] = []

    for (let i = 0; i < totalChunks; i += MAX_PARALLEL_CHUNKS) {
      const batchEnd = Math.min(i + MAX_PARALLEL_CHUNKS, totalChunks)
      const batchPromises = []

      for (let j = i; j < batchEnd; j++) {
        batchPromises.push(
          uploadChunk(uploadId, j, chunks[j], file.name, totalChunks, accessToken)
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
              errors.push(`Chunk ${j}: ${err.message}`)
              return null
            })
        )
      }

      const results = await Promise.all(batchPromises)
      if (errors.length > 0) {
        return { success: false, error: errors.join("; ") }
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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

/**
 * Upload a single chunk with streaming support
 * Uses XMLHttpRequest for better streaming and progress tracking
 */
async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  chunk: Blob,
  fileName: string,
  totalChunks: number,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.onerror = () => {
      reject(new Error(`Network error uploading chunk ${chunkIndex}. Please check your internet connection and try again.`))
    }

    xhr.ontimeout = () => {
      reject(new Error(`Upload timeout for chunk ${chunkIndex}. The file may be too large or your connection is slow.`))
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
    xhr.timeout = 60000 // 60 second timeout for chunk uploads
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
  accessToken?: string
): Promise<ChunkUploadResult> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("portalId", portalId)
  formData.append("clientName", clientInfo.clientName || "")
  formData.append("clientEmail", clientInfo.clientEmail || "")
  formData.append("clientMessage", clientInfo.clientMessage || "")
  if (accessToken) formData.append("token", accessToken)

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: accessToken ? { "Authorization": `Bearer ${accessToken}` } : {},
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
    return { success: false, error: error.error || `Upload failed (${res.status})` }
  }

  const result = await res.json()
  return {
    success: true,
    fileId: result.uploadId,
  }
}
