/**
 * Streaming upload utilities for large files
 * Implements chunked uploads to reduce memory footprint
 */

export interface ChunkUploadConfig {
  chunkSize: number // Size of each chunk in bytes (default: 5MB)
  concurrentChunks: number // Number of concurrent chunk uploads (default: 3)
  maxRetries: number // Max retries per chunk (default: 3)
}

const DEFAULT_CONFIG: ChunkUploadConfig = {
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  concurrentChunks: 3,
  maxRetries: 3,
}

/**
 * Upload a file in chunks for better memory efficiency on large files
 * Useful for files > 50MB
 */
export async function uploadFileInChunks(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void,
  config: Partial<ChunkUploadConfig> = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const totalChunks = Math.ceil(file.size / finalConfig.chunkSize)
  let uploadedBytes = 0

  // Upload chunks with concurrency control
  const chunkPromises: Promise<void>[] = []

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    // Wait if we've queued up too many concurrent uploads
    if (chunkPromises.length >= finalConfig.concurrentChunks) {
      await Promise.race(chunkPromises)
      chunkPromises.length = 0
    }

    const start = chunkIndex * finalConfig.chunkSize
    const end = Math.min(start + finalConfig.chunkSize, file.size)
    const chunk = file.slice(start, end)

    const uploadPromise = uploadChunk(
      uploadUrl,
      chunk,
      chunkIndex,
      totalChunks,
      file.size,
      finalConfig.maxRetries
    ).then(() => {
      uploadedBytes += chunk.size
      if (onProgress) {
        onProgress(Math.round((uploadedBytes / file.size) * 100))
      }
    })

    chunkPromises.push(uploadPromise)
  }

  // Wait for all remaining chunks
  await Promise.all(chunkPromises)
}

/**
 * Upload a single chunk with retry logic
 */
async function uploadChunk(
  uploadUrl: string,
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  fileSize: number,
  maxRetries: number,
  attempt = 0
): Promise<void> {
  const start = chunkIndex * chunk.size
  const end = start + chunk.size - 1

  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Type": "application/octet-stream",
      },
      body: chunk,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      return uploadChunk(uploadUrl, chunk, chunkIndex, totalChunks, fileSize, maxRetries, attempt + 1)
    }
    throw error
  }
}
