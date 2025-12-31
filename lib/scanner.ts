
import { Buffer } from "buffer"

export type ScanResult = 
  | { status: "clean" }
  | { status: "infected"; threat: string }
  | { status: "error"; message: string }

// EICAR test file signature (standard anti-malware test file)
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

// MIME types that don't need scanning (safe by nature)
export const SAFE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/html",
  "text/css"
])

/**
 * Scans a file buffer for malware.
 * Currently implements:
 * 1. EICAR test signature detection
 * 2. Placeholder for ClamAV/Cloud scanning
 * 3. Skip scanning for known-safe MIME types
 */
export async function scanFile(buffer: Buffer, fileName: string, mimeType?: string): Promise<ScanResult> {
  try {
    // 1. Skip scanning for safe MIME types (image, audio, video, PDF, text)
    if (mimeType && SAFE_MIME_TYPES.has(mimeType)) {
      console.log(`[Security] Skipping scan for safe MIME type: ${mimeType}`)
      return { status: "clean" }
    }

    // 2. Check for EICAR signature (quick check on first 1MB for performance)
    const checkSize = Math.min(buffer.length, 1024 * 1024) // Only check first 1MB
    const content = buffer.subarray(0, checkSize).toString("utf-8", 0, checkSize)
    if (content.includes(EICAR_SIGNATURE)) {
      console.warn(`[Security] EICAR test signature detected in file: ${fileName}`)
      return { status: "infected", threat: "EICAR-Test-Signature" }
    }

    // 3. TODO: Integrate with ClamAV or Cloud Scanning API
    // Example:
    // const clamscan = new NodeClam().init({...})
    // const { isInfected, viruses } = await clamscan.scanStream(Readable.from(buffer))
    
    // For now, assume clean if no obvious signatures found
    return { status: "clean" }
    
  } catch (error) {
    console.error("Error scanning file:", error)
    return { status: "error", message: "Failed to scan file" }
  }
}
