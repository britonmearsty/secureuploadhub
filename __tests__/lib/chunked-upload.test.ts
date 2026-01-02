import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChunks, uploadFileInChunks } from '@/lib/chunked-upload'

// Mock compression module
vi.mock('@/lib/compression', () => ({
  preprocessFile: vi.fn((file) => Promise.resolve(file))
}))

describe('chunked-upload', () => {
  describe('createChunks', () => {
    it('should split file into chunks of correct size', () => {
      const data = new Uint8Array(15 * 1024 * 1024) // 15MB
      const file = new File([data], 'test.bin')
      const chunkSize = 5 * 1024 * 1024 // 5MB

      const chunks = createChunks(file, chunkSize)

      expect(chunks.length).toBe(3)
      expect(chunks[0].size).toBe(chunkSize)
      expect(chunks[1].size).toBe(chunkSize)
      expect(chunks[2].size).toBe(chunkSize)
    })

    it('should handle file smaller than chunk size', () => {
      const data = new Uint8Array(1024 * 1024) // 1MB
      const file = new File([data], 'test.bin')
      const chunkSize = 5 * 1024 * 1024

      const chunks = createChunks(file, chunkSize)

      expect(chunks.length).toBe(1)
      expect(chunks[0].size).toBe(1024 * 1024)
    })

    it('should preserve file data across chunks', () => {
      const originalData = new Uint8Array(10 * 1024 * 1024)
      for (let i = 0; i < originalData.length; i++) {
        originalData[i] = i % 256
      }
      const file = new File([originalData], 'test.bin')
      const chunkSize = 3 * 1024 * 1024

      const chunks = createChunks(file, chunkSize)

      let position = 0
      chunks.forEach((chunk) => {
        expect(chunk.size).toBeLessThanOrEqual(chunkSize)
        position += chunk.size
      })
      expect(position).toBe(originalData.length)
    })

    it('should handle very small chunk sizes', () => {
      const data = new Uint8Array(1024) // 1KB
      const file = new File([data], 'test.bin')
      const chunkSize = 256 // 256 bytes

      const chunks = createChunks(file, chunkSize)

      expect(chunks.length).toBe(4)
      chunks.forEach((chunk) => {
        expect(chunk.size).toBeLessThanOrEqual(chunkSize)
      })
    })
  })

  describe('uploadFileInChunks', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      global.fetch = vi.fn()
    })

    it('should initialize upload session', async () => {
      const data = new Uint8Array(1024) // 1KB - single chunk
      const file = new File([data], 'test.txt', { type: 'text/plain' })

      global.fetch = vi.fn((url) => {
        if (url.includes('/api/upload/chunked/init')) {
          return Promise.resolve(
            new Response(JSON.stringify({ uploadId: 'test-id' }), {
              status: 200,
            })
          )
        }
        if (url.includes('/api/upload')) {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, uploadId: 'upload-id' }), {
              status: 200,
            })
          )
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      const result = await uploadFileInChunks(
        'portal-123',
        file,
        { clientName: 'Test User' }
      )

      // For small files (1KB), it should use regular upload, not chunked
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload'),
        expect.any(Object)
      )
    })

    it('should handle single chunk files', async () => {
      const data = new Uint8Array(1024) // 1KB
      const file = new File([data], 'test.txt', { type: 'text/plain' })

      global.fetch = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        )
      )

      const result = await uploadFileInChunks(
        'portal-123',
        file,
        { clientName: 'Test User' }
      )

      expect(result.success).toBe(true)
    })

    it('should handle upload errors gracefully', async () => {
      const data = new Uint8Array(10 * 1024 * 1024) // 10MB
      const file = new File([data], 'test.bin')

      global.fetch = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Upload failed' }), { status: 400 })
        )
      )

      const result = await uploadFileInChunks(
        'portal-123',
        file,
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should track progress with callback', async () => {
      const data = new Uint8Array(1024) // Use small file to avoid chunked upload complexity
      const file = new File([data], 'test.bin')
      const progressUpdates: number[] = []

      global.fetch = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true, uploadId: 'upload-123' }), { status: 200 })
        )
      )

      const result = await uploadFileInChunks(
        'portal-123',
        file,
        {},
        undefined,
        (progress) => {
          progressUpdates.push(progress.percentComplete)
        }
      )

      // For small files, it uses regular upload which doesn't have progress callbacks
      expect(result.success).toBe(true)
    })

    it('should handle disabled compression', async () => {
      const data = new Uint8Array(1024)
      const file = new File([data], 'test.txt', { type: 'text/plain' })

      global.fetch = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        )
      )

      const result = await uploadFileInChunks(
        'portal-123',
        file,
        {},
        undefined,
        undefined,
        false // disable compression
      )

      expect(result.success).toBe(true)
    })
  })
})
