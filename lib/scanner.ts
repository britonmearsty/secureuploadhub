
import { Buffer } from "buffer"

export type ScanResult = 
  | { status: "clean" }
  | { status: "infected"; threat: string }
  | { status: "error"; message: string }

// EICAR test file signature (standard anti-malware test file)
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

// MIME types that don't need scanning (safe by nature)
export const SAFE_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/ico",
  
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/avi",
  "video/x-msvideo",
  
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  
  // Text files
  "text/plain",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "text/typescript",
  "text/markdown",
  "text/xml",
  "application/json",
  "application/xml",
  "text/yaml",
  "text/x-yaml",
  
  // Code files (by MIME type when available)
  "text/x-python",
  "text/x-java-source",
  "text/x-c",
  "text/x-c++",
  "text/x-csharp",
  "text/x-php",
  "text/x-ruby",
  "text/x-go",
  "text/x-rust",
  "text/x-swift",
  "text/x-kotlin",
  "text/x-scala",
  "text/x-sql",
  "text/x-sh",
  "text/x-dockerfile",
  
  // Configuration files
  "application/toml",
  "text/x-ini",
  "text/x-properties"
])

// File extensions that are safe by nature (when MIME type is not available or reliable)
export const SAFE_FILE_EXTENSIONS = new Set([
  // Images
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".ico",
  
  // Videos
  ".mp4", ".webm", ".mov", ".avi", ".mkv", ".wmv", ".flv",
  
  // Audio
  ".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a", ".wma",
  
  // Documents
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf",
  
  // Text and code files
  ".md", ".markdown", ".txt", ".csv", ".json", ".xml", ".yaml", ".yml",
  ".html", ".htm", ".css", ".js", ".ts", ".jsx", ".tsx",
  ".py", ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".php", ".rb", ".go", ".rs",
  ".swift", ".kt", ".scala", ".sql", ".sh", ".bash", ".zsh", ".fish",
  
  // Configuration files
  ".toml", ".ini", ".conf", ".config", ".env", ".gitignore", ".gitattributes",
  ".dockerfile", ".dockerignore", ".editorconfig", ".eslintrc", ".prettierrc",
  ".babelrc", ".npmrc", ".yarnrc", ".nvmrc"
])

/**
 * Scans a file buffer for malware.
 * Currently implements:
 * 1. EICAR test signature detection
 * 2. Placeholder for ClamAV/Cloud scanning
 * 3. Skip scanning for known-safe MIME types and file extensions
 */
export async function scanFile(buffer: Buffer, fileName: string, mimeType?: string): Promise<ScanResult> {
  try {
    // 1. Skip scanning for safe MIME types (image, audio, video, PDF, text)
    if (mimeType && SAFE_MIME_TYPES.has(mimeType)) {
      console.log(`[Security] Skipping scan for safe MIME type: ${mimeType}`)
      return { status: "clean" }
    }

    // 2. Skip scanning for safe file extensions (when MIME type is not available or reliable)
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    if (fileExtension && SAFE_FILE_EXTENSIONS.has(fileExtension)) {
      console.log(`[Security] Skipping scan for safe file extension: ${fileExtension}`)
      return { status: "clean" }
    }

    // 3. Check for EICAR signature (quick check on first 1MB for performance)
    const checkSize = Math.min(buffer.length, 1024 * 1024) // Only check first 1MB
    const content = buffer.subarray(0, checkSize).toString("utf-8", 0, checkSize)
    if (content.includes(EICAR_SIGNATURE)) {
      console.warn(`[Security] EICAR test signature detected in file: ${fileName}`)
      return { status: "infected", threat: "EICAR-Test-Signature" }
    }

    // 4. TODO: Integrate with ClamAV or Cloud Scanning API
    // Example:
    // const clamscan = new NodeClam().init({...})
    // const { isInfected, viruses } = await clamscan.scanStream(Readable.from(buffer))
    
    // For now, assume clean if no obvious signatures found
    console.log(`[Security] Scanning completed for: ${fileName} (${mimeType || 'no MIME type'})`)
    return { status: "clean" }
    
  } catch (error) {
    console.error("Error scanning file:", error)
    return { status: "error", message: "Failed to scan file" }
  }
}
