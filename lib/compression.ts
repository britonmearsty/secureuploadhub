/**
 * Client-side compression utilities
 * Reduces upload bandwidth for compressible file types
 */

export interface CompressionOptions {
  quality?: number // 0-1 for images
  maxWidth?: number
  maxHeight?: number
  targetFormat?: 'webp' | 'jpeg'
}

/**
 * Check if file type is compressible
 */
export function isCompressible(mimeType: string): boolean {
  const compressibleTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/bmp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
  ]
  return compressibleTypes.includes(mimeType)
}

/**
 * Compress image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    quality = 0.8,
    maxWidth = 2048,
    maxHeight = 2048,
    targetFormat = 'webp',
  } = options

  // Only compress if file is over 1MB
  if (file.size < 1024 * 1024) {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        const ext = targetFormat === 'webp' ? 'webp' : 'jpg'
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // Return as new File with .webp or .jpg extension
            const newFileName = file.name.replace(/\.[^.]+$/, `.${ext}`)
            const compressed = new File([blob], newFileName, {
              type: `image/${targetFormat}`,
            })

            console.log(
              `Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((compressed.size / file.size) * 100)}%)`
            )

            resolve(compressed)
          },
          `image/${targetFormat}`,
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compress text-based file
 */
export async function compressText(file: File): Promise<File> {
  if (file.size < 1024 * 1024) {
    return file
  }

  try {
    const text = await file.text()
    // Minify JSON if applicable
    let compressed = text
    if (
      file.type === 'application/json' ||
      file.name.endsWith('.json')
    ) {
      try {
        const parsed = JSON.parse(text)
        compressed = JSON.stringify(parsed)
      } catch {
        // Not valid JSON, return as-is
      }
    }

    // Remove unnecessary whitespace for XML
    if (
      file.type === 'application/xml' ||
      file.name.endsWith('.xml')
    ) {
      compressed = text.replace(/>\s+</g, '><')
    }

    const blob = new Blob([compressed], { type: file.type })
    const newFile = new File([blob], file.name, { type: file.type })

    const reduction = 100 - Math.round((newFile.size / file.size) * 100)
    if (reduction > 0) {
      console.log(
        `Minified ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(newFile.size / 1024).toFixed(0)}KB (${reduction}% smaller)`
      )
    }

    return newFile
  } catch {
    return file
  }
}

/**
 * Preprocess file before upload (compress if needed)
 */
export async function preprocessFile(
  file: File,
  enableCompression = true
): Promise<File> {
  if (!enableCompression || !isCompressible(file.type)) {
    return file
  }

  try {
    // Compress images
    if (file.type.startsWith('image/')) {
      return await compressImage(file, { quality: 0.8 })
    }

    // Minify text-based files
    if (
      file.type.startsWith('text/') ||
      file.type === 'application/json' ||
      file.type === 'application/xml'
    ) {
      return await compressText(file)
    }
  } catch (error) {
    console.warn(`Failed to compress ${file.name}:`, error)
  }

  return file
}
