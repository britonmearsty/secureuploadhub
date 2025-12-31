import { describe, it, expect, vi } from 'vitest'
import {
  isCompressible,
  compressText,
  preprocessFile,
} from '@/lib/compression'

describe('compression', () => {
  describe('isCompressible', () => {
    it('should identify compressible image types', () => {
      expect(isCompressible('image/jpeg')).toBe(true)
      expect(isCompressible('image/png')).toBe(true)
      expect(isCompressible('image/webp')).toBe(true)
      expect(isCompressible('image/gif')).toBe(true)
    })

    it('should identify compressible text types', () => {
      expect(isCompressible('text/plain')).toBe(true)
      expect(isCompressible('text/csv')).toBe(true)
      expect(isCompressible('application/json')).toBe(true)
      expect(isCompressible('application/xml')).toBe(true)
    })

    it('should identify compressible document types', () => {
      expect(isCompressible('application/pdf')).toBe(true)
    })

    it('should identify non-compressible types', () => {
      expect(isCompressible('application/zip')).toBe(false)
      expect(isCompressible('application/gzip')).toBe(false)
      expect(isCompressible('video/mp4')).toBe(false)
      expect(isCompressible('audio/mpeg')).toBe(false)
    })
  })

  describe('compressText', () => {
    it('should minify JSON', async () => {
      const jsonContent = JSON.stringify(
        { name: 'test', value: 123, nested: { key: 'value' } },
        null,
        2
      )
      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      })

      const compressed = await compressText(file)

      expect(compressed.size).toBeLessThanOrEqual(file.size)
      expect(compressed.name).toBe('test.json')
    })

    it('should minify XML', async () => {
      const xmlContent = `<?xml version="1.0"?>
      <root>
        <item>value1</item>
        <item>value2</item>
      </root>`

      const file = new File([xmlContent], 'test.xml', {
        type: 'application/xml',
      })

      const compressed = await compressText(file)

      expect(compressed.size).toBeLessThanOrEqual(file.size)
    })

    it('should skip compression for small files', async () => {
      const content = 'small content'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const result = await compressText(file)

      expect(result.name).toBe('test.txt')
      expect(result.type).toBe('text/plain')
    })

    it('should handle invalid JSON gracefully', async () => {
      const invalidJson = 'not valid json'
      const file = new File([invalidJson], 'test.json', {
        type: 'application/json',
      })

      const result = await compressText(file)

      // Should return file as-is if JSON parsing fails
      expect(result.name).toBe('test.json')
    })
  })

  describe('preprocessFile', () => {
    it('should skip compression for non-compressible types', async () => {
      const data = new Uint8Array(1024)
      const file = new File([data], 'test.bin', { type: 'application/octet-stream' })

      const result = await preprocessFile(file)

      expect(result.name).toBe(file.name)
      expect(result.size).toBe(file.size)
    })

    it('should skip compression when disabled', async () => {
      const jsonContent = JSON.stringify({ test: true }, null, 2)
      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      })

      const result = await preprocessFile(file, false)

      expect(result.name).toBe(file.name)
    })

    it('should handle text compression', async () => {
      const jsonContent = JSON.stringify({ name: 'test', value: 123 }, null, 2)
      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      })

      const result = await preprocessFile(file, true)

      expect(result.name).toBe('test.json')
      expect(result.type).toBe('application/json')
    })

    it('should handle compression errors gracefully', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      // Even if compression fails, should return original file
      const result = await preprocessFile(file, true)

      expect(result.name).toBe('test.txt')
    })
  })

  describe('image compression', () => {
    it('should identify when compression should be skipped for small images', async () => {
      const smallImageData = new Uint8Array(100 * 1024) // 100KB
      const file = new File([smallImageData], 'small.jpg', { type: 'image/jpeg' })

      const result = await preprocessFile(file)

      // Small file should not be compressed (< 1MB threshold)
      expect(result.name).toBe('small.jpg')
    })

    it('should preserve file type for text files', async () => {
      const content = 'test\ncontent\nhere'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const result = await preprocessFile(file, true)

      expect(result.type).toBe('text/plain')
    })
  })
})
