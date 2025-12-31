/**
 * Upload performance metrics tracking
 * Monitors and logs upload speeds for optimization
 */

export interface UploadMetrics {
  portalId: string
  fileName: string
  fileSize: number
  duration: number // milliseconds
  uploadSpeed: number // bytes per second
  chunksUploaded: number
  compressionRatio: number
}

const metricsBuffer: UploadMetrics[] = []
const MAX_BUFFER_SIZE = 100

/**
 * Record upload metrics
 */
export function recordUploadMetrics(metrics: UploadMetrics): void {
  const uploadSpeedMbps = (metrics.uploadSpeed / 1024 / 1024).toFixed(2)
  const durationSecs = (metrics.duration / 1000).toFixed(2)
  const fileSizeMb = (metrics.fileSize / 1024 / 1024).toFixed(2)

  console.log(
    `[UPLOAD METRIC] ${metrics.fileName}: ${fileSizeMb}MB in ${durationSecs}s @ ${uploadSpeedMbps}Mbps`
  )

  metricsBuffer.push(metrics)

  // Flush to analytics when buffer reaches max size
  if (metricsBuffer.length >= MAX_BUFFER_SIZE) {
    flushMetrics()
  }
}

/**
 * Calculate upload metrics
 */
export function calculateMetrics(
  portalId: string,
  fileName: string,
  fileSize: number,
  duration: number,
  chunksUploaded: number,
  originalFileSize?: number
): UploadMetrics {
  const uploadSpeed = fileSize / (duration / 1000)
  const compressionRatio = originalFileSize
    ? fileSize / originalFileSize
    : 1

  return {
    portalId,
    fileName,
    fileSize,
    duration,
    uploadSpeed,
    chunksUploaded,
    compressionRatio,
  }
}

/**
 * Get average upload speed
 */
export function getAverageUploadSpeed(): number {
  if (metricsBuffer.length === 0) return 0
  const totalSpeed = metricsBuffer.reduce((sum, m) => sum + m.uploadSpeed, 0)
  return totalSpeed / metricsBuffer.length
}

/**
 * Flush metrics to analytics service
 */
export async function flushMetrics(): Promise<void> {
  if (metricsBuffer.length === 0) return

  try {
    // Send to analytics/monitoring service
    const metrics = metricsBuffer.splice(0, MAX_BUFFER_SIZE)
    
    // Example: Could send to PostHog, DataDog, or custom endpoint
    console.log(
      `[METRICS] Flushing ${metrics.length} upload metrics to analytics`
    )

    // You could send to an API endpoint here:
    // await fetch('/api/metrics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ metrics }),
    // })
  } catch (error) {
    console.error("Failed to flush metrics:", error)
  }
}

/**
 * Get optimization recommendations based on metrics
 */
export function getOptimizationRecommendations(metrics: UploadMetrics): string[] {
  const recommendations: string[] = []
  const uploadSpeedMbps = metrics.uploadSpeed / 1024 / 1024

  if (uploadSpeedMbps < 1) {
    recommendations.push("Upload speed is very slow. Check network conditions.")
  }

  if (metrics.compressionRatio > 0.9) {
    recommendations.push("File compression is not effective. Consider skipping compression.")
  }

  if (metrics.duration > 60000) {
    // > 1 minute
    recommendations.push("Consider enabling parallel chunk uploads for faster transfers.")
  }

  if (metrics.chunksUploaded > 100) {
    recommendations.push("Consider increasing chunk size for better throughput.")
  }

  return recommendations
}
