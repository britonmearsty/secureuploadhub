import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  recordUploadMetrics,
  calculateMetrics,
  getAverageUploadSpeed,
  flushMetrics,
  getOptimizationRecommendations,
} from '@/lib/upload-metrics'

describe('upload-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateMetrics', () => {
    it('should calculate correct upload speed', () => {
      const metrics = calculateMetrics(
        'portal-1',
        'test.jpg',
        10 * 1024 * 1024, // 10MB
        10000, // 10 seconds
        2 // 2 chunks
      )

      expect(metrics.uploadSpeed).toBe((10 * 1024 * 1024) / 10) // 1MB/s
    })

    it('should handle very fast uploads', () => {
      const metrics = calculateMetrics(
        'portal-1',
        'small.txt',
        1024, // 1KB
        100, // 100ms
        1
      )

      expect(metrics.uploadSpeed).toBeGreaterThan(0)
      expect(metrics.duration).toBe(100)
    })

    it('should calculate compression ratio', () => {
      const metrics = calculateMetrics(
        'portal-1',
        'image.jpg',
        5 * 1024 * 1024,
        5000,
        1,
        10 * 1024 * 1024 // Original 10MB
      )

      expect(metrics.compressionRatio).toBe(0.5) // 50% compression
    })

    it('should default compression ratio to 1 without original size', () => {
      const metrics = calculateMetrics(
        'portal-1',
        'test.bin',
        10 * 1024 * 1024,
        10000,
        1
      )

      expect(metrics.compressionRatio).toBe(1)
    })

    it('should include all metric fields', () => {
      const metrics = calculateMetrics(
        'portal-1',
        'test.bin',
        10 * 1024 * 1024,
        10000,
        2
      )

      expect(metrics.portalId).toBe('portal-1')
      expect(metrics.fileName).toBe('test.bin')
      expect(metrics.fileSize).toBe(10 * 1024 * 1024)
      expect(metrics.duration).toBe(10000)
      expect(metrics.chunksUploaded).toBe(2)
      expect(metrics.uploadSpeed).toBeDefined()
      expect(metrics.compressionRatio).toBeDefined()
    })
  })

  describe('recordUploadMetrics', () => {
    it('should log upload metrics', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      const metrics = calculateMetrics(
        'portal-1',
        'test.jpg',
        50 * 1024 * 1024, // 50MB
        10000, // 10 seconds
        10
      )

      recordUploadMetrics(metrics)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[UPLOAD METRIC]')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.jpg')
      )

      consoleSpy.mockRestore()
    })

    it('should include file size in output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      const metrics = calculateMetrics(
        'portal-1',
        'large.bin',
        100 * 1024 * 1024,
        20000,
        5
      )

      recordUploadMetrics(metrics)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('100.00MB')
      )

      consoleSpy.mockRestore()
    })

    it('should include duration in output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      const metrics = calculateMetrics('portal-1', 'test.bin', 50 * 1024 * 1024, 5000, 1)

      recordUploadMetrics(metrics)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('5.00s')
      )

      consoleSpy.mockRestore()
    })

    it('should include upload speed in output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      const metrics = calculateMetrics(
        'portal-1',
        'test.bin',
        50 * 1024 * 1024, // 50MB
        5000, // 5 seconds = 10MB/s
        1
      )

      recordUploadMetrics(metrics)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mbps')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getAverageUploadSpeed', () => {
    it('should return 0 for empty metrics', () => {
      const speed = getAverageUploadSpeed()
      expect(speed).toBe(0)
    })

    it('should calculate average of multiple uploads', () => {
      const metrics1 = calculateMetrics('p-1', 'a.bin', 10 * 1024 * 1024, 10000, 1)
      const metrics2 = calculateMetrics('p-1', 'b.bin', 20 * 1024 * 1024, 10000, 2)

      recordUploadMetrics(metrics1)
      recordUploadMetrics(metrics2)

      const average = getAverageUploadSpeed()

      expect(average).toBeGreaterThan(0)
    })
  })

  describe('flushMetrics', () => {
    it('should handle empty metrics gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      await flushMetrics()

      // Should not log anything
      expect(
        consoleSpy.mock.calls.some((call) =>
          call[0]?.toString().includes('Flushing')
        )
      ).toBe(false)

      consoleSpy.mockRestore()
    })

    it('should log flush message when metrics exist', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      const metrics = calculateMetrics('p-1', 'test.bin', 50 * 1024 * 1024, 10000, 1)

      recordUploadMetrics(metrics)
      await flushMetrics()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Flushing')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getOptimizationRecommendations', () => {
    it('should recommend parallel uploads for slow speeds', () => {
      const metrics = calculateMetrics('p-1', 'test.bin', 50 * 1024 * 1024, 60000, 1)

      const recommendations = getOptimizationRecommendations(metrics)

      expect(recommendations).toContain(
        expect.stringContaining('parallel chunk uploads')
      )
    })

    it('should recommend skipping compression for low ratio', () => {
      const metrics = calculateMetrics(
        'p-1',
        'test.jpg',
        50 * 1024 * 1024,
        10000,
        1,
        51 * 1024 * 1024 // Almost no compression
      )

      const recommendations = getOptimizationRecommendations(metrics)

      expect(recommendations).toContain(
        expect.stringContaining('compression')
      )
    })

    it('should warn about slow network', () => {
      const metrics = calculateMetrics('p-1', 'test.bin', 10 * 1024 * 1024, 60000, 1)
      metrics.uploadSpeed = 0.5 * 1024 * 1024 // 0.5 MB/s = very slow

      const recommendations = getOptimizationRecommendations(metrics)

      expect(recommendations.some((r) => r.includes('slow'))).toBe(true)
    })

    it('should recommend larger chunks for many chunks', () => {
      const metrics = calculateMetrics('p-1', 'test.bin', 500 * 1024 * 1024, 60000, 150)

      const recommendations = getOptimizationRecommendations(metrics)

      expect(recommendations).toContain(
        expect.stringContaining('chunk size')
      )
    })

    it('should not recommend anything for ideal metrics', () => {
      const metrics = calculateMetrics('p-1', 'test.bin', 50 * 1024 * 1024, 5000, 10)

      const recommendations = getOptimizationRecommendations(metrics)

      // Should have minimal or no recommendations
      expect(recommendations.length).toBeLessThan(3)
    })
  })

  describe('performance tracking', () => {
    it('should track multiple uploads', () => {
      const metrics1 = calculateMetrics('p-1', 'a.bin', 10 * 1024 * 1024, 10000, 2)
      const metrics2 = calculateMetrics('p-1', 'b.bin', 20 * 1024 * 1024, 15000, 4)
      const metrics3 = calculateMetrics('p-1', 'c.bin', 30 * 1024 * 1024, 20000, 6)

      recordUploadMetrics(metrics1)
      recordUploadMetrics(metrics2)
      recordUploadMetrics(metrics3)

      const average = getAverageUploadSpeed()

      expect(average).toBeGreaterThan(0)
    })

    it('should handle fast uploads', () => {
      const metrics = calculateMetrics(
        'p-1',
        'fast.txt',
        100 * 1024, // 100KB
        100, // 100ms = 1MB/s
        1
      )

      expect(metrics.uploadSpeed).toBeGreaterThan(1024 * 1024)
    })

    it('should handle slow uploads', () => {
      const metrics = calculateMetrics(
        'p-1',
        'slow.bin',
        10 * 1024 * 1024, // 10MB
        100000, // 100 seconds = 100KB/s
        20
      )

      expect(metrics.uploadSpeed).toBeLessThan(1024 * 1024)
    })
  })

  describe('compression tracking', () => {
    it('should calculate good compression ratio', () => {
      const metrics = calculateMetrics(
        'p-1',
        'image.jpg',
        5 * 1024 * 1024,
        5000,
        1,
        20 * 1024 * 1024 // 75% compression
      )

      expect(metrics.compressionRatio).toBe(0.25)
    })

    it('should calculate poor compression ratio', () => {
      const metrics = calculateMetrics(
        'p-1',
        'archive.zip',
        10 * 1024 * 1024,
        10000,
        1,
        10.1 * 1024 * 1024 // Almost no compression
      )

      expect(metrics.compressionRatio).toBeGreaterThan(0.99)
    })
  })
})
